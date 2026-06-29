import { verifyToken } from '../config/jwt.js';
import { requestContext } from '../config/db.js';
import { userRepo } from '../repositories/index.js';

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try {
    req.user = verifyToken(token);
    // Bind the request to an ALS scope so postgres repos can pull the user
    // name for audit_log rows without threading it through every call site.
    const userName = req.user?.username || 'unknown';
    requestContext.run({ userName }, () => next());
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// Resolve req.allowedTrustIds:
//   - admin           → null (unrestricted)
//   - non-admin user  → array of trust ids assigned to them (possibly empty)
//
// Mount this AFTER authMiddleware on routes that operate on trust-scoped data.
export async function attachTrustScope(req, _res, next) {
  try {
    if (!req.user || req.user.role === 'admin') {
      req.allowedTrustIds = null;
    } else {
      req.allowedTrustIds = await userRepo.findTrustIdsForUser(req.user.sub);
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function trustIsAllowed(req, trustId) {
  if (!req.allowedTrustIds) return true;
  return req.allowedTrustIds.includes(trustId);
}
