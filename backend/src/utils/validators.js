import { AppError } from '../middleware/error.js';

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const MOBILE_REGEX = /^[0-9]{10}$/;
export const AADHAAR_REGEX = /^[0-9]{12}$/;

export function assertString(value, field, { required = false, maxLength = 500 } = {}) {
  if (value == null || value === '') {
    if (required) throw new AppError(`${field} is required`, 400);
    return '';
  }
  if (typeof value !== 'string') throw new AppError(`${field} must be a string`, 400);
  const trimmed = value.trim();
  if (required && !trimmed) throw new AppError(`${field} is required`, 400);
  if (trimmed.length > maxLength) throw new AppError(`${field} is too long`, 400);
  return trimmed;
}

export function assertPan(value, field = 'PAN', { required = false } = {}) {
  const s = assertString(value, field, { required, maxLength: 10 });
  if (!s) return '';
  const upper = s.toUpperCase();
  if (!PAN_REGEX.test(upper)) throw new AppError(`${field} format is invalid`, 400);
  return upper;
}

export function assertMobile(value, field = 'Mobile', { required = false } = {}) {
  const s = assertString(value, field, { required, maxLength: 10 });
  if (!s) return '';
  if (!MOBILE_REGEX.test(s)) throw new AppError(`${field} must be a 10-digit number`, 400);
  return s;
}

export function assertAadhaar(value, field = 'Aadhaar', { required = false } = {}) {
  const s = assertString(value, field, { required, maxLength: 12 });
  if (!s) return '';
  const compact = s.replace(/\s+/g, '');
  if (!AADHAAR_REGEX.test(compact)) throw new AppError(`${field} must be a 12-digit number`, 400);
  return compact;
}

export function assertAmount(value, field = 'Amount') {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new AppError(`${field} must be a positive number`, 400);
  return Math.round(n * 100) / 100;
}

export function assertDate(value, field = 'Date', { required = false } = {}) {
  if (!value) {
    if (required) throw new AppError(`${field} is required`, 400);
    return '';
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new AppError(`${field} is invalid`, 400);
  return d.toISOString().slice(0, 10);
}
