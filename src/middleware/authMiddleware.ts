import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type AllowedRole = 'student' | 'organizer';

export interface AuthenticatedUserContext {
  id?: string;
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      userRole?: string;
      userId?: string;
    }
  }
}

/**
 * Middleware to enforce strict Role-Based Access Control (RBAC).
 * Checks x-user-role and x-user-id headers (or JWT Bearer token).
 * Returns HTTP 403 Forbidden if the incoming role is not permitted.
 */
export const requireRole = (allowedRoles: AllowedRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Check for simulated headers first (x-user-role, x-user-id)
    let role = req.headers['x-user-role'] as string | undefined;
    let userId = req.headers['x-user-id'] as string | undefined;

    // 2. Fall back to JWT Bearer token if header is not present
    if (!role && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const secret = process.env.JWT_SECRET || 'college_events_jwt_secret_key';
        const decoded = jwt.verify(token, secret) as { id?: string; userId?: string; role?: string };
        if (decoded && decoded.role) {
          role = decoded.role;
          userId = decoded.userId || decoded.id;
        }
      } catch {
        // Token verification failed or expired
      }
    }

    const normalizedRole = role ? (role.trim().toLowerCase() as AllowedRole) : undefined;

    // If role is missing or not in allowedRoles (admin granted superuser access if present)
    if (!normalizedRole || (!allowedRoles.includes(normalizedRole) && normalizedRole !== ('admin' as any))) {
      res.status(403).json({
        message: 'Access denied. Insufficient permissions.',
      });
      return;
    }

    req.userRole = normalizedRole;
    req.userId = userId;
    next();
  };
};

