import { donorRepo, trustRepo, receiptRepo } from '../repositories/index.js';

export const dashboardService = {
  async summary() {
    const [donors, trusts, receipts, recentReceiptsRaw] = await Promise.all([
      donorRepo.findAll(),
      trustRepo.findAll(),
      receiptRepo.findAll(),
      receiptRepo.recent(5),
    ]);
    const totalAmount = receipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const recentReceipts = await Promise.all(recentReceiptsRaw.map(async (r) => {
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
