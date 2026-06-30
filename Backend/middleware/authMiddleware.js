import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors.js';

/**
 * Strict authentication middleware.
 * Requires a valid JWT token in the Authorization header.
 */
export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access denied. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';
    
    const decoded = jwt.verify(token, jwtSecret);
    req.user = { userId: decoded.id };
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(new AppError('Invalid or expired token.', 401));
  }
};

/**
 * Optional authentication middleware.
 * Checks for a JWT token but does not fail if it is missing or invalid.
 */
export const optionalAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';
      const decoded = jwt.verify(token, jwtSecret);
      req.user = { userId: decoded.id };
    }
  } catch (error) {
    // Fail silently since it is optional auth, proceed as guest
  }
  next();
};
