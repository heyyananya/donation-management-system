import { yearRepo, receiptRepo } from '../repositories/index.js';
import { AppError } from '../middleware/error.js';
import { assertString, assertDate } from '../utils/validators.js';
import { isValidFinancialYear } from '../utils/financialYear.js';

async function sanitize(input, { ignoreId = null } = {}) {
  const name = assertString(input.name, 'Financial Year', { required: true, maxLength: 10 });
  if (!isValidFinancialYear(name)) {
    throw new AppError('Financial Year must be in YYYY-YY format (e.g. 2025-26)', 400);
  }
  const startDate = assertDate(input.startDate, 'Start Date', { required: true });
  const endDate = assertDate(input.endDate, 'End Date', { required: true });
  if (startDate >= endDate) {
    throw new AppError('Start Date must be before End Date', 400);
  }
  const dup = await yearRepo.findByName(name);
  if (dup && dup.id !== ignoreId) {
    throw new AppError(`Financial Year "${name}" already exists`, 400);
  }
  return {
    name,
    startDate,
    endDate,
    isActive: input.isActive === undefined ? true : !!input.isActive,
  };
}

export const yearService = {
  list: () => yearRepo.findAll(),
  active: async () => (await yearRepo.findAll()).filter((y) => y.isActive),
  get: async (id) => {
    const y = await yearRepo.findById(id);
    if (!y) throw new AppError('Financial Year not found', 404);
    return y;
  },
  getByName: (name) => yearRepo.findByName(name),
  create: async (input) => yearRepo.create(await sanitize(input)),
  update: async (id, input) => {
    if (!(await yearRepo.findById(id))) throw new AppError('Financial Year not found', 404);
    return yearRepo.update(id, await sanitize(input, { ignoreId: id }));
  },
  remove: async (id) => {
    const y = await yearRepo.findById(id);
    if (!y) throw new AppError('Financial Year not found', 404);
    const linked = await receiptRepo.findAll({ financialYear: y.name });
    if (linked.length) {
      throw new AppError(
        `Financial Year "${y.name}" has ${linked.length} receipt(s) linked and cannot be deleted`,
        400
      );
    }
    await yearRepo.remove(id);
  },
};
