import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Middleware to profile request timing and log slow endpoints.
 * Adds X-Response-Time header and logs requests exceeding threshold.
 */
export function requestProfiler(thresholdMs = 500) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    // Patch res.writeHead to set the header before headers are sent
    const originalWriteHead = res.writeHead;
    res.writeHead = function (...args: any[]) {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      try {
        res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
      } catch (e) {
        /* ignore if already sent */
      }
      // Support all overloads of writeHead
      // @ts-expect-error ignore lint error
      return originalWriteHead.apply(this, args);
    };
    // Log slow requests after response is finished
    res.on('finish', () => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      if (durationMs > thresholdMs) {
        logger.warn(
          `Slow endpoint: ${req.method} ${req.originalUrl} took ${durationMs.toFixed(2)}ms`,
        );
      }
    });
    next();
  };
}
