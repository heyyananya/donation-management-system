import bcrypt from 'bcryptjs';
import { signToken } from '../config/jwt.js';
import { AppError } from '../middleware/error.js';
import { userRepo } from '../repositories/index.js';

export const authService = {
  async login({ username, password }) {
    if (!username || !password) throw new AppError('Username and password are required', 400);
    const user = await userRepo.findByUsername(username);
    if (!user || !user.isActive) {
      throw new AppError('Invalid username or password', 401);
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new AppError('Invalid username or password', 401);
    const token = signToken({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
    return {
      token,
      user: {
        username: user.username,
        role: user.role,
        displayName: user.displayName || user.username,
        trustIds: user.trustIds || [],
      },
    };
  },
  async me(req) {
    const username = req.user?.username;
    const user = username ? await userRepo.findByUsername(username) : null;
    return {
      username: user?.username || username || '',
      role: user?.role || 'admin',
      displayName: user?.displayName || user?.username || 'Administrator',
      trustIds: user?.trustIds || [],
    };
  },
};
