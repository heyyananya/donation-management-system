import { v4 as uuid } from 'uuid';
import { store } from './_store.js';

const C = 'users';

function withTrustIds(user) {
  if (!user) return user;
  return { ...user, trustIds: Array.isArray(user.trustIds) ? user.trustIds : [] };
}

export const userRepo = {
  findAll: () => store.all(C).map(withTrustIds),
  findById: (id) => withTrustIds(store.find(C, (u) => u.id === id) || null),
  findByUsername: (username) =>
    withTrustIds(
      store.find(C, (u) => (u.username || '').toLowerCase() === String(username || '').toLowerCase()) || null
    ),
  findTrustIdsForUser: (id) => {
    const u = store.find(C, (x) => x.id === id);
    return Array.isArray(u?.trustIds) ? [...u.trustIds] : [];
  },
  create: ({
    username,
    passwordHash,
    displayName = null,
    email = null,
    role = 'admin',
    isActive = true,
    trustIds = [],
  }) => {
    const now = new Date().toISOString();
    return store.insert(C, {
      id: uuid(),
      username,
      passwordHash,
      displayName,
      email,
      role,
      isActive,
      trustIds: role === 'admin' ? [] : [...trustIds],
      createdAt: now,
      updatedAt: now,
    });
  },
  update: (id, patch) => {
    const current = store.find(C, (u) => u.id === id);
    if (!current) return null;
    const nextRole = patch.role ?? current.role;
    const nextTrustIds = patch.trustIds !== undefined
      ? [...patch.trustIds]
      : (current.trustIds || []);
    return store.update(C, id, {
      ...patch,
      trustIds: nextRole === 'admin' ? [] : nextTrustIds,
      updatedAt: new Date().toISOString(),
    });
  },
  remove: (id) => store.remove(C, id),
};
