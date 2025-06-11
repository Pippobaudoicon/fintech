import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import redisClient from '../config/redis';
import logger from '../utils/logger';

/**
 * Middleware for caching API responses in Redis.
 * @param getCacheKey Function to generate a unique cache key based on the request
 * @param ttl Time to live for the cache entry in seconds (default: 60)
 */
export function cacheResponse(getCacheKey: (req: AuthenticatedRequest) => string, ttl = 60) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const key = getCacheKey(req);
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        logger.info(`Cache hit: ${key}`);
        res.setHeader('X-Cache', 'HIT');
        res.json(JSON.parse(cached));
        return;
      }
      // Monkey-patch res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        redisClient.setEx(key, ttl, JSON.stringify(body)).catch((err) => {
          logger.warn('Failed to cache response:', err);
        });
        res.setHeader('X-Cache', 'MISS');
        return originalJson(body);
      };
      next();
    } catch (err) {
      logger.warn('Cache middleware error:', err);
      next();
    }
  };
}

/**
 * Helper to build a cache key for transaction list requests
 */
export function transactionListCacheKey(req: AuthenticatedRequest) {
  const userId = req.user?.id || 'anon';
  const { page = 1, limit = 10, ...filters } = req.query;
  return `transactions:${userId}:page=${page}:limit=${limit}:` +
    Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
}

/**
 * Helper to build a cache key for user account summary
 */
export function accountSummaryCacheKey(req: AuthenticatedRequest) {
  const userId = req.user?.id || 'anon';
  return `account-summary:${userId}`;
}
