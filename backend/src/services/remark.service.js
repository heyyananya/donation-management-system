import { remarkRepo, receiptRepo } from '../repositories/index.js';
import { AppError } from '../middleware/error.js';
import { assertString } from '../utils/validators.js';

function sanitize(input) {
  return {
    name: assertString(input.name, 'Remark Name', { required: true, maxLength: 200 }),
  };
}

export const remarkService = {
  list: () => remarkRepo.findAll(),
  get: async (id) => {
    const r = await remarkRepo.findById(id);
    if (!r) throw new AppError('Remark not found', 404);
    return r;
  },
  create: (input) => remarkRepo.create(sanitize(input)),
  update: async (id, input) => {
    if (!(await remarkRepo.findById(id))) throw new AppError('Remark not found', 404);
    return remarkRepo.update(id, sanitize(input));
  },
  remove: async (id) => {
    if (!(await remarkRepo.findById(id))) throw new AppError('Remark not found', 404);
    const all = await receiptRepo.findAll();
    const used = all.filter((r) => r.remarkId === id);
    if (used.length) throw new AppError('Remark is in use and cannot be deleted', 400);
    await remarkRepo.remove(id);
  },
};
