import { v4 as uuid } from 'uuid';
import { store } from './_store.js';

const C = 'users';

export const userRepo = {
  findAll: () => store.all(C),
  findById: (id) => store.find(C, (u) => u.id === id) || null,
  findByUsername: (username) =>
    store.find(C, (u) => (u.username || '').toLowerCase() === String(username || '').toLowerCase()) || null,
  create: ({ username, passwordHash, displayName = null, role = 'admin', isActive = true }) => {
    const now = new Date().toISOString();
    return store.insert(C, {
      id: uuid(), username, passwordHash, displayName, role, isActive,
      createdAt: now, updatedAt: now,
    });
  },
  update: (id, patch) => store.update(C, id, { ...patch, updatedAt: new Date().toISOString() }),
  remove: (id) => store.remove(C, id),
};
