import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const message = err.message || 'Internal server error occurred';
  const statusCode = err.statusCode || 500;
  return sendError(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : undefined);
};