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
      [d.name, d.mobile, d.pan, d.aadhaar, d.voterId, d.passport, d.address]
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
  // Read-and-merge in one synchronous call (no `await` in between) so two
  // uploads fired close together can't both read the same array and have one
  // write clobber the other's document — mirrors the Postgres repo's fix.
  appendDocument: (id, doc) => {
    const cur = store.find(C, (d) => d.id === id);
    if (!cur) return null;
    const documents = [...(cur.documents || []), doc];
    return store.update(C, id, { documents, updatedAt: new Date().toISOString() });
  },
  removeDocumentById: (id, docId) => {
    const cur = store.find(C, (d) => d.id === id);
    if (!cur) return null;
    const documents = (cur.documents || []).filter((x) => x.id !== docId);
    return store.update(C, id, { documents, updatedAt: new Date().toISOString() });
  },
};
