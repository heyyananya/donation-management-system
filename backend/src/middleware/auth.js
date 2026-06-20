import { verifyToken } from '../config/jwt.js';
import { requestContext } from '../config/db.js';

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
