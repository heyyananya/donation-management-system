import { v4 as uuid } from 'uuid';
import { store } from './_store.js';

const C = 'receipts';

export const receiptRepo = {
  findAll: (filters = {}) => {
    const list = store.all(C);
    return list
      .filter((r) => (filters.financialYear ? r.financialYear === filters.financialYear : true))
      .filter((r) => (filters.trustId ? r.trustId === filters.trustId : true))
      .filter((r) => {
        if (!Array.isArray(filters.trustIds)) return true;
        if (filters.trustIds.length === 0) return false;
        return filters.trustIds.includes(r.trustId);
      })
      .filter((r) => (filters.donorId ? r.donorId === filters.donorId : true))
      .filter((r) => (filters.remarkId ? r.remarkId === filters.remarkId : true))
      .filter((r) => (filters.paymentType ? r.paymentType === filters.paymentType : true))
      .filter((r) => (filters.dateFrom ? r.date >= filters.dateFrom : true))
      .filter((r) => (filters.dateTo ? r.date <= filters.dateTo : true))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.number - a.number));
  },
  findById: (id) => store.find(C, (r) => r.id === id) || null,
  findMaxNumber: (fy, trustId) => {
    // Include soft-deleted receipts so sequence numbers are never reused.
    const rows = store
      .allWithDeleted(C)
      .filter((r) => r.financialYear === fy && r.trustId === trustId);
    return rows.reduce((m, r) => Math.max(m, r.number || 0), 0);
  },
  create: (data) => {
    const now = new Date().toISOString();
    return store.insert(C, { id: uuid(), createdAt: now, updatedAt: now, ...data });
  },
  update: (id, patch) => store.update(C, id, { ...patch, updatedAt: new Date().toISOString() }),
  remove: (id) => store.remove(C, id),
  countAll: () => store.all(C).length,
  recent: (limit = 5) =>
    store
      .all(C)
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limit),
};
