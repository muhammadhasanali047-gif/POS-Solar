import { Response } from 'express';

export interface ApiResponseData<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: any;
}

export const sendSuccess = <T>(res: Response, data: T, message?: string, statusCode = 200, meta?: any) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
};

export const sendError = (res: Response, error: string, statusCode = 400, details?: any) => {
  return res.status(statusCode).json({
    success: false,
    error,
    details,
  });
};