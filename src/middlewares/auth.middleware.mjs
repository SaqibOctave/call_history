import { verifyAccessToken } from '../utils/jwt.mjs';
import { createError } from '../utils/response.mjs';
import { HTTP_STATUS } from '../utils/response.mjs';

export function authenticate(req, _res, next) {
  const authHeader = req.headers['authorization'];
  const token      = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next(createError('Access token required', HTTP_STATUS.UNAUTHORIZED));
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(createError('Invalid or expired access token', HTTP_STATUS.UNAUTHORIZED));
  }
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(createError('Insufficient permissions', HTTP_STATUS.FORBIDDEN));
    }
    next();
  };
}
