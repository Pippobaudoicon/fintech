import { Request, Response, NextFunction } from 'express';
import redisClient from '../config/redis';
import logger from '../utils/logger';
import { errorResponse } from '../utils/helpers';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  headers?: boolean;
}

export interface RateLimitInfo {
  totalHits: number;
  totalHitsForIp: number;
  resetTime: Date;
  limit: number;
  remaining: number;
}

const defaultKeyGenerator = (req: Request): string => {
  // Use IP address as default key
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  return `rate_limit:${ip}`;
};

/**
 * Redis-based rate limiter middleware
 * @param options Rate limiting configuration
 * @returns Express middleware function
 */
export const createRedisRateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = 'Too many requests, please try again later',
    headers = true,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = keyGenerator(req);
      const windowInSeconds = Math.ceil(windowMs / 1000);
      
      // Check if Redis is connected
      if (!redisClient.isReady) {
        logger.warn('Redis not connected, skipping rate limiting');
        next();
        return;
      }

      // Get current count and TTL
      const multi = redisClient.multi();
      multi.incr(key);
      multi.expire(key, windowInSeconds);
      multi.ttl(key);
      
      const results = await multi.exec();
      
      if (!results) {
        logger.error('Redis multi operation failed');
        next();
        return;
      }

      const currentCount = Number(results[0]) || 0;
      const ttl = Number(results[2]) || 0;
      
      // Calculate reset time
      const resetTime = new Date(Date.now() + (ttl * 1000));
      const remaining = Math.max(0, maxRequests - currentCount);

      // Set rate limit headers
      if (headers) {
        res.set({
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': resetTime.getTime().toString(),
          'X-RateLimit-Window': windowMs.toString(),
        });
      }

      // Check if rate limit exceeded
      if (currentCount > maxRequests) {
        logger.warn(`Rate limit exceeded for key: ${key}`, {
          currentCount,
          maxRequests,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
        });

        res.status(429).json({
          success: false,
          message,
          error: {
            retryAfter: ttl,
            limit: maxRequests,
            remaining: 0,
            resetTime: resetTime.toISOString(),
          }
        });
        return;
      }

      // Store rate limit info in request for potential use in other middleware
      (req as any).rateLimit = {
        totalHits: currentCount,
        totalHitsForIp: currentCount,
        resetTime,
        limit: maxRequests,
        remaining,
      } as RateLimitInfo;

      next();
    } catch (error) {
      logger.error('Redis rate limiter error:', error);
      // Fail open - continue without rate limiting if Redis fails
      next();
    }
  };
};

/**
 * Create a rate limiter for user-specific actions
 * @param req Express request object
 * @returns User-specific rate limiting key
 */
export const createUserRateLimit = (options: RateLimitOptions) => {
  return createRedisRateLimit({
    ...options,
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id;
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return userId ? `rate_limit:user:${userId}` : `rate_limit:ip:${ip}`;
    },
  });
};

/**
 * Create a rate limiter for API endpoint-specific limiting
 * @param endpoint The API endpoint identifier
 * @param options Rate limiting configuration
 * @returns Express middleware function
 */
export const createEndpointRateLimit = (endpoint: string, options: RateLimitOptions) => {
  return createRedisRateLimit({
    ...options,
    keyGenerator: (req: Request) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return `rate_limit:endpoint:${endpoint}:${ip}`;
    },
  });
};

/**
 * Create a rate limiter for financial operations with stricter limits
 * @param options Rate limiting configuration
 * @returns Express middleware function
 */
export const createFinancialRateLimit = (options: Partial<RateLimitOptions> = {}) => {
  return createUserRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute for financial operations
    message: 'Too many financial operations, please wait before trying again',
    ...options,
  });
};

/**
 * Create a rate limiter for authentication operations
 * @param options Rate limiting configuration
 * @returns Express middleware function
 */
export const createAuthRateLimit = (options: Partial<RateLimitOptions> = {}) => {
  return createRedisRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later',
    ...options,
    keyGenerator: (req: Request) => {
      const email = req.body?.email;
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return email ? `rate_limit:auth:${email}` : `rate_limit:auth:ip:${ip}`;
    },
  });
};

/**
 * Get current rate limit status for a key
 * @param key Rate limiting key
 * @param windowMs Window in milliseconds
 * @param maxRequests Maximum requests allowed
 * @returns Current rate limit status
 */
export const getRateLimitStatus = async (
  key: string,
  windowMs: number,
  maxRequests: number
): Promise<RateLimitInfo | null> => {
  try {
    if (!redisClient.isReady) {
      return null;
    }

    const multi = redisClient.multi();
    multi.get(key);
    multi.ttl(key);
    
    const results = await multi.exec();
    
    if (!results) {
      return null;
    }

    const currentCount = parseInt(String(results[0]) || '0', 10);
    const ttl = Number(results[1]) || 0;
    
    const resetTime = new Date(Date.now() + (ttl * 1000));
    const remaining = Math.max(0, maxRequests - currentCount);

    return {
      totalHits: currentCount,
      totalHitsForIp: currentCount,
      resetTime,
      limit: maxRequests,
      remaining,
    };
  } catch (error) {
    logger.error('Error getting rate limit status:', error);
    return null;
  }
};

/**
 * Reset rate limit for a specific key
 * @param key Rate limiting key to reset
 * @returns Success status
 */
export const resetRateLimit = async (key: string): Promise<boolean> => {
  try {
    if (!redisClient.isReady) {
      return false;
    }

    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('Error resetting rate limit:', error);
    return false;
  }
};
