import { v4 as uuid } from 'uuid';
import { store } from './_store.js';

const C = 'donors';

function withTrustIds(donor) {
  if (!donor) return donor;
  return { ...donor, trustIds: Array.isArray(donor.trustIds) ? donor.trustIds : [] };
}

function inScope(donor, trustIds) {
  if (trustIds === null || trustIds === undefined) return true;
  if (trustIds.length === 0) return false;
  const linked = donor.trustIds || [];
  return linked.some((id) => trustIds.includes(id));
}

export const donorRepo = {
  findAll: (opts = {}) =>
    store.all(C)
      .map(withTrustIds)
      .filter((d) => inScope(d, opts.trustIds))
      .filter((d) => (opts.trustId ? (d.trustIds || []).includes(opts.trustId) : true))
      .sort((a, b) => a.name.localeCompare(b.name)),
  findById: (id, opts = {}) => {
    const d = store.find(C, (x) => x.id === id);
    if (!d) return null;
    const decorated = withTrustIds(d);
    if (!inScope(decorated, opts.trustIds)) return null;
    return decorated;
  },
  search: (q, opts = {}) => {
    const term = (q || '').toLowerCase();
    const scoped = donorRepo.findAll(opts);
    if (!term) return scoped;
    return scoped.filter((d) =>
      [d.name, d.mobile, d.pan, d.aadhaar, d.voterId, d.passport, d.address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  },
  create: (data) => {
    const now = new Date().toISOString();
    const { trustIds = [], ...rest } = data;
    const row = {
      id: uuid(),
      createdAt: now,
      updatedAt: now,
      ...rest,
      trustIds: [...trustIds],
    };
    return store.insert(C, row);
  },
  update: (id, patch) => {
    const cur = store.find(C, (d) => d.id === id);
    if (!cur) return null;
    const next = {
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    if (patch.trustIds !== undefined) next.trustIds = [...patch.trustIds];
    return store.update(C, id, next);
  },
  remove: (id) => store.remove(C, id),
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
