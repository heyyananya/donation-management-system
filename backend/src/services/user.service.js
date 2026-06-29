import bcrypt from 'bcryptjs';
import { userRepo, trustRepo } from '../repositories/index.js';
import { AppError } from '../middleware/error.js';
import { assertString } from '../utils/validators.js';

const ROLES = new Set(['admin', 'user']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicShape(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  void passwordHash;
  return rest;
}

async function sanitizeTrustIds(role, raw) {
  if (role === 'admin') return [];
  if (!Array.isArray(raw)) return [];
  const ids = [...new Set(raw.filter((x) => typeof x === 'string' && x))];
  if (!ids.length) return [];
  const all = await trustRepo.findAll();
  const valid = new Set(all.map((t) => t.id));
  for (const id of ids) {
    if (!valid.has(id)) throw new AppError(`Trust ${id} does not exist`, 400);
  }
  return ids;
}

async function sanitize(input, { isUpdate = false, currentUsername = null } = {}) {
  const username = assertString(input.username, 'Username', { required: true, maxLength: 80 });
  const displayName = assertString(input.displayName, 'Display Name', { maxLength: 200 });
  const emailRaw = assertString(input.email, 'Email', { maxLength: 200 });
  const email = emailRaw || null;
  if (email && !EMAIL_RE.test(email)) throw new AppError('Email format is invalid', 400);

  const role = assertString(input.role, 'Role', { required: true, maxLength: 20 });
  if (!ROLES.has(role)) throw new AppError('Role must be "admin" or "user"', 400);

  const isActive = input.isActive === undefined ? true : !!input.isActive;
  const trustIds = await sanitizeTrustIds(role, input.trustIds);

  // Uniqueness on username (case-insensitive).
  if (!isUpdate || username.toLowerCase() !== (currentUsername || '').toLowerCase()) {
    const dup = await userRepo.findByUsername(username);
    if (dup) throw new AppError(`Username "${username}" is already in use`, 400);
  }

  return { username, displayName, email, role, isActive, trustIds };
}

export const userService = {
  list: async () => (await userRepo.findAll()).map(publicShape),
  get: async (id) => {
    const u = await userRepo.findById(id);
    if (!u) throw new AppError('User not found', 404);
    return publicShape(u);
  },
  create: async (input) => {
    const data = await sanitize(input);
    const password = assertString(input.password, 'Password', { required: true, maxLength: 200 });
    if (password.length < 6) throw new AppError('Password must be at least 6 characters', 400);
    if (data.role === 'user' && data.trustIds.length === 0) {
      throw new AppError('At least one trust must be assigned to a non-admin user', 400);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await userRepo.create({ ...data, passwordHash });
    return publicShape(created);
  },
  update: async (id, input, { actingUsername = null } = {}) => {
    const existing = await userRepo.findById(id);
    if (!existing) throw new AppError('User not found', 404);
    const data = await sanitize(input, { isUpdate: true, currentUsername: existing.username });
    if (data.role === 'user' && data.trustIds.length === 0) {
      throw new AppError('At least one trust must be assigned to a non-admin user', 400);
    }
    // Prevent locking yourself out — can't demote your own admin account.
    if (actingUsername && existing.username.toLowerCase() === actingUsername.toLowerCase()) {
      if (data.role !== 'admin') {
        throw new AppError('You cannot change your own role from admin', 400);
      }
      if (!data.isActive) {
        throw new AppError('You cannot deactivate your own account', 400);
      }
    }
    const patch = { ...data };
    if (input.password) {
      const password = assertString(input.password, 'Password', { required: true, maxLength: 200 });
      if (password.length < 6) throw new AppError('Password must be at least 6 characters', 400);
      patch.passwordHash = await bcrypt.hash(password, 10);
    }
    const updated = await userRepo.update(id, patch);
    return publicShape(updated);
  },
  remove: async (id, { actingUsername = null } = {}) => {
    const existing = await userRepo.findById(id);
    if (!existing) throw new AppError('User not found', 404);
    if (actingUsername && existing.username.toLowerCase() === actingUsername.toLowerCase()) {
      throw new AppError('You cannot delete your own account', 400);
    }
    await userRepo.remove(id);
  },
};
