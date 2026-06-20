import { v4 as uuid } from 'uuid';
import { store } from './_store.js';

const C = 'years';

export const yearRepo = {
  findAll: () =>
    store
      .all(C)
      .slice()
      .sort((a, b) => (a.name < b.name ? 1 : a.name > b.name ? -1 : 0)),
  findById: (id) => store.find(C, (y) => y.id === id) || null,
  findByName: (name) => store.find(C, (y) => y.name === name) || null,
  create: (data) => {
    const now = new Date().toISOString();
    return store.insert(C, { id: uuid(), createdAt: now, updatedAt: now, ...data });
  },
  update: (id, patch) => store.update(C, id, { ...patch, updatedAt: new Date().toISOString() }),
  remove: (id) => store.remove(C, id),
};
