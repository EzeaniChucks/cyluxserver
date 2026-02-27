import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiResponse } from '../utils/response';
import { AdminRole } from '../entities/Admin';

const JWT_SECRET = process.env.JWT_SECRET;
const DEVICE_JWT_SECRET = process.env.DEVICE_JWT_SECRET;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
const INFLUENCER_JWT_SECRET = process.env.INFLUENCER_JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET must be set in environment variables');
}
if (!DEVICE_JWT_SECRET) {
  throw new Error('FATAL: DEVICE_JWT_SECRET must be set in environment variables');
}

export const protectParent = (req: any, res: Response, next: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ApiResponse.error(res, 'Unauthorized: No token provided', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as { id: string; role: string };

    if (decoded.role !== 'parent') {
      return ApiResponse.error(res, 'Unauthorized: Access denied', 403);
    }

    req.user = decoded;
    next();
  } catch (error: any) {
    const message = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return ApiResponse.error(res, `Unauthorized: ${message}`, 401);
  }
};

// Device JWT verification — replaces the insecure X-Device-ID header check
export const protectChild = (req: any, res: Response, next: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ApiResponse.error(res, 'Unauthorized: Device token required', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, DEVICE_JWT_SECRET!) as { deviceId: string; role: string };

    if (decoded.role !== 'child') {
      return ApiResponse.error(res, 'Unauthorized: Invalid device token', 403);
    }

    req.deviceId = decoded.deviceId;
    next();
  } catch (error: any) {
    const message = error.name === 'TokenExpiredError' ? 'Device token expired' : 'Invalid device token';
    return ApiResponse.error(res, `Unauthorized: ${message}`, 401);
  }
};

/**
 * Admin JWT middleware with optional role-based access control.
 * Usage: protectAdmin(['superadmin', 'admin']) or protectAdmin() for any admin role.
 */
export const protectAdmin = (allowedRoles?: AdminRole[]) => (req: any, res: Response, next: any) => {
  if (!ADMIN_JWT_SECRET) {
    return ApiResponse.error(res, 'Admin auth not configured', 500);
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ApiResponse.error(res, 'Unauthorized: No token provided', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as { id: string; role: AdminRole };

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
      return ApiResponse.error(res, 'Forbidden: Insufficient permissions', 403);
    }

    req.admin = decoded;
    next();
  } catch (error: any) {
    const message = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return ApiResponse.error(res, `Unauthorized: ${message}`, 401);
  }
};

/**
 * Influencer JWT middleware for the influencer self-serve portal.
 */
export const protectInfluencer = (req: any, res: Response, next: any) => {
  if (!INFLUENCER_JWT_SECRET) {
    return ApiResponse.error(res, 'Influencer auth not configured', 500);
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ApiResponse.error(res, 'Unauthorized: No token provided', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, INFLUENCER_JWT_SECRET) as { id: string };
    req.influencer = decoded;
    next();
  } catch (error: any) {
    const message = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return ApiResponse.error(res, `Unauthorized: ${message}`, 401);
  }
};
