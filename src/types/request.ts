import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: 'parent' | 'admin';
  };
}

export interface ChildRequest extends Request {
  deviceId?: string;
}
