import { v4 as uuid } from 'uuid';
import { store } from './_store.js';

const C = 'remarks';

export const remarkRepo = {
  findAll: () => store.all(C).sort((a, b) => a.name.localeCompare(b.name)),
  findById: (id) => store.find(C, (d) => d.id === id) || null,
  create: (data) => {
    const now = new Date().toISOString();
    return store.insert(C, { id: uuid(), createdAt: now, updatedAt: now, ...data });
  },
  update: (id, patch) => store.update(C, id, { ...patch, updatedAt: new Date().toISOString() }),
  remove: (id) => store.remove(C, id),
};
