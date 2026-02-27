import { ApiResponse } from '../utils/response';

// Fix: Changed next type to any to avoid signature mismatch issues in the middleware chain
export const errorHandler = (err: any, req: any, res: any, next: any) => {
  console.error(`[Server Error] ${err.stack}`);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  return ApiResponse.error(res, message, status, process.env.NODE_ENV === 'development' ? err.stack : null);
};

// Fix: Changed next to any and wrapped catch call to resolve "Argument of type 'NextFunction' is not assignable"
export const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch((err: any) => next(err));
};