import { v4 as uuid } from 'uuid';
import { store } from './_store.js';

const C = 'trusts';

export const trustRepo = {
  findAll: () => store.all(C).sort((a, b) => a.name.localeCompare(b.name)),
  findById: (id) => store.find(C, (d) => d.id === id) || null,
  create: (data) => {
    const now = new Date().toISOString();
    const row = { id: uuid(), createdAt: now, updatedAt: now, ...data };
    return store.insert(C, row);
  },
  update: (id, patch) => store.update(C, id, { ...patch, updatedAt: new Date().toISOString() }),
  remove: (id) => store.remove(C, id),
};
