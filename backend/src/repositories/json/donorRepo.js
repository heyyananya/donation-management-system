import { v4 as uuid } from 'uuid';
import { store } from './_store.js';

const C = 'donors';

export const donorRepo = {
  findAll: () => store.all(C).sort((a, b) => a.name.localeCompare(b.name)),
  findById: (id) => store.find(C, (d) => d.id === id) || null,
  search: (q) => {
    const term = (q || '').toLowerCase();
    if (!term) return donorRepo.findAll();
    return donorRepo.findAll().filter((d) =>
      [d.name, d.mobile, d.pan, d.aadhaar, d.passport, d.address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  },
  create: (data) => {
    const now = new Date().toISOString();
    const row = { id: uuid(), createdAt: now, updatedAt: now, ...data };
    return store.insert(C, row);
  },
  update: (id, patch) => store.update(C, id, { ...patch, updatedAt: new Date().toISOString() }),
  remove: (id) => store.remove(C, id),
};
