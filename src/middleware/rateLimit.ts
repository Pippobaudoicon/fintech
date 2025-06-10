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
  onLimitReached?: (req: Request, res: Response) => void;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

/**
 * Sliding window rate limiter using Redis
 */
export class SlidingWindowRateLimit {
  private readonly options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = {
      keyGenerator: (req: Request) => this.getClientIdentifier(req),
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      onLimitReached: () => {},
      ...options,
    };
  }

  /**
   * Create middleware function
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const key = this.options.keyGenerator(req);
        const now = Date.now();
        const windowStart = now - this.options.windowMs;

        // Use Redis sorted sets for sliding window
        const redisKey = `rate_limit:${key}`;

        // Remove expired entries
        await redisClient.zremrangebyscore(redisKey, 0, windowStart);

        // Count current requests in window
        const currentCount = await redisClient.zcard(redisKey);

        // Check if limit exceeded
        if (currentCount >= this.options.maxRequests) {
          const oldestRequest = await redisClient.zrange(redisKey, 0, 0, 'WITHSCORES');
          const resetTime = oldestRequest.length > 0 
            ? new Date(parseInt(oldestRequest[1]) + this.options.windowMs)
            : new Date(now + this.options.windowMs);

          const rateLimitInfo: RateLimitInfo = {
            limit: this.options.maxRequests,
            remaining: 0,
            reset: resetTime,
            retryAfter: Math.ceil((resetTime.getTime() - now) / 1000),
          };

          this.setRateLimitHeaders(res, rateLimitInfo);
          this.options.onLimitReached(req, res);

          res.status(429).json(errorResponse(
            'Too many requests, please try again later',
            `Rate limit exceeded. Try again in ${rateLimitInfo.retryAfter} seconds`
          ));
          return;
        }

        // Add current request to window
        await redisClient.zadd(redisKey, now.toString(), `${now}_${Math.random()}`);
        await redisClient.expire(redisKey, Math.ceil(this.options.windowMs / 1000));

        // Set rate limit info for response
        const remaining = Math.max(0, this.options.maxRequests - currentCount - 1);
        const resetTime = new Date(now + this.options.windowMs);

        const rateLimitInfo: RateLimitInfo = {
          limit: this.options.maxRequests,
          remaining,
          reset: resetTime,
        };

        this.setRateLimitHeaders(res, rateLimitInfo);

        // Store rate limit info for potential cleanup on response
        (req as any).rateLimitInfo = {
          key: redisKey,
          timestamp: now,
          shouldCleanup: false,
        };

        // Set up response cleanup
        this.setupResponseCleanup(req, res);

        next();
      } catch (error) {
        logger.error('Rate limiting error:', error);
        // Fail open - allow request if rate limiting fails
        next();
      }
    };
  }

  /**
   * Get client identifier for rate limiting
   */
  private getClientIdentifier(req: Request): string {
    // Try to get user ID from auth context
    if ((req as any).user?.id) {
      return `user:${(req as any).user.id}`;
    }

    // Fall back to IP address
    const forwarded = req.headers['x-forwarded-for'] as string;
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
    return `ip:${ip}`;
  }

  /**
   * Set rate limit headers
   */
  private setRateLimitHeaders(res: Response, info: RateLimitInfo): void {
    res.set({
      'X-RateLimit-Limit': info.limit.toString(),
      'X-RateLimit-Remaining': info.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(info.reset.getTime() / 1000).toString(),
    });

    if (info.retryAfter) {
      res.set('Retry-After', info.retryAfter.toString());
    }
  }

  /**
   * Setup response cleanup for failed requests
   */
  private setupResponseCleanup(req: Request, res: Response): void {
    const originalSend = res.send;
    const rateLimitInfo = (req as any).rateLimitInfo;

    res.send = function(body) {
      const statusCode = res.statusCode;
      
      // Determine if we should clean up based on response
      if (
        (statusCode >= 400 && !rateLimitInfo.options?.skipFailedRequests) ||
        (statusCode < 400 && rateLimitInfo.options?.skipSuccessfulRequests)
      ) {
        rateLimitInfo.shouldCleanup = true;
      }

      return originalSend.call(this, body);
    };

    res.on('finish', async () => {
      if (rateLimitInfo.shouldCleanup) {
        try {
          await redisClient.zrem(
            rateLimitInfo.key,
            `${rateLimitInfo.timestamp}_${Math.random()}`
          );
        } catch (error) {
          logger.error('Failed to cleanup rate limit entry:', error);
        }
      }
    });
  }
}

/**
 * Create rate limiter for transaction endpoints
 */
export const createTransactionRateLimit = () => {
  return new SlidingWindowRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 transactions per minute per user
    onLimitReached: (req, res) => {
      logger.warn(`Transaction rate limit exceeded for ${req.ip}`, {
        userId: (req as any).user?.id,
        endpoint: req.path,
      });
    },
  }).middleware();
};

/**
 * Create rate limiter for bulk operations
 */
export const createBulkOperationRateLimit = () => {
  return new SlidingWindowRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3, // 3 bulk operations per minute per user
    onLimitReached: (req, res) => {
      logger.warn(`Bulk operation rate limit exceeded for ${req.ip}`, {
        userId: (req as any).user?.id,
        endpoint: req.path,
      });
    },
  }).middleware();
};

/**
 * Create rate limiter for authentication endpoints
 */
export const createAuthRateLimit = () => {
  return new SlidingWindowRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes per IP
    keyGenerator: (req) => {
      const forwarded = req.headers['x-forwarded-for'] as string;
      const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
      return `auth:${ip}`;
    },
    onLimitReached: (req, res) => {
      logger.warn(`Authentication rate limit exceeded for ${req.ip}`, {
        endpoint: req.path,
      });
    },
  }).middleware();
};

/**
 * Create general API rate limiter
 */
export const createGeneralRateLimit = () => {
  return new SlidingWindowRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute per user/IP
    onLimitReached: (req, res) => {
      logger.warn(`General rate limit exceeded for ${req.ip}`, {
        userId: (req as any).user?.id,
        endpoint: req.path,
      });
    },
  }).middleware();
};

export default SlidingWindowRateLimit;
