import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { User, IUser, UserRole } from '../models/User';
import { AppError } from './errorHandler';

export interface DecodedTokenPayload extends JwtPayload {
  id: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

/**
 * Middleware to protect routes and verify JWT token.
 */
export const protect = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader: string | undefined = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Authentication required. No token provided.', 401));
    }

    const secret: string = process.env.JWT_SECRET || 'college_events_jwt_secret_key';
    const decoded: DecodedTokenPayload = jwt.verify(token, secret) as DecodedTokenPayload;

    if (!decoded || !decoded.id) {
      return next(new AppError('Invalid token payload.', 401));
    }

    const currentUser: IUser | null = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    req.user = currentUser;
    next();
  } catch (error: unknown) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid or expired authentication token.', 401));
    }
    next(error as Error);
  }
};

/**
 * Middleware to restrict route access to specific roles.
 */
export const restrictTo = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('Access forbidden: You do not have permission to perform this action.', 403)
      );
    }

    next();
  };
};

