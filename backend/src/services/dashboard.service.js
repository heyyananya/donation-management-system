import { donorRepo, trustRepo, receiptRepo } from '../repositories/index.js';

export const dashboardService = {
  async summary({ allowedTrustIds = null } = {}) {
    const allTrusts = await trustRepo.findAll();
    const trusts = allowedTrustIds
      ? allTrusts.filter((t) => allowedTrustIds.includes(t.id))
      : allTrusts;

    const receiptFilter = allowedTrustIds ? { trustIds: allowedTrustIds } : {};

    // Donors are scoped the same way trusts are — a user only ever sees the
    // donors linked to at least one of their allowed trusts. Admins pass
    // trustIds: null → repo returns everything.
    const donorScope = allowedTrustIds ? { trustIds: allowedTrustIds } : {};

    const [donors, receipts, recentReceiptsRaw] = await Promise.all([
      donorRepo.findAll(donorScope),
      receiptRepo.findAll(receiptFilter),
      receiptRepo.recent(50),
    ]);

    const filteredRecent = (allowedTrustIds
      ? recentReceiptsRaw.filter((r) => allowedTrustIds.includes(r.trustId))
      : recentReceiptsRaw
    ).slice(0, 5);

    const totalAmount = receipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const recentReceipts = await Promise.all(filteredRecent.map(async (r) => {
      const [donor, trust] = await Promise.all([
        donorRepo.findById(r.donorId),
        trustRepo.findById(r.trustId),
      ]);
      return {
        id: r.id,
        number: r.number,
        financialYear: r.financialYear,
        date: r.date,
        amount: r.amount,
        paymentType: r.paymentType,
        donorId: r.donorId,
        trustId: r.trustId,
        donorName: donor?.name || '',
        trustName: trust?.name || '',
      };
    }));
    const recentDonors = donors
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 5)
      .map((d) => ({ id: d.id, name: d.name, mobile: d.mobile, pan: d.pan }));
    return {
      totals: {
        donors: donors.length,
        trusts: trusts.length,
        receipts: receipts.length,
        donations: totalAmount,
      },
      recentReceipts,
      recentDonors,
    };
  },
};
