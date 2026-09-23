import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  logger.error(
    {
      err: err?.message || err,
      stack: err?.stack,
      path: req.path,
      method: req.method,
    },
    'Unhandled request error'
  );

  const statusCode = err.status || err.statusCode || 500;
  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred'
      : err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
  });
}
