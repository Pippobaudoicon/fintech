import { Request, Response, NextFunction } from 'express';
import { cacheService, CacheOptions, CacheService } from '../services/cacheService';
import logger from '../utils/logger';

export interface CacheMiddlewareOptions extends CacheOptions {
    keyGenerator?: (req: Request) => string;
    condition?: (req: Request, res: Response) => boolean;
    invalidateOn?: string[]; // HTTP methods that should invalidate cache
}

/**
 * Cache middleware for API responses
 */
export const createCacheMiddleware = (options: CacheMiddlewareOptions = {}) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Skip caching for non-GET requests by default
            if (req.method !== 'GET') {
                return next();
            }

            // Check condition if provided
            if (options.condition && !options.condition(req, res)) {
                return next();
            }

            // Generate cache key
            const cacheKey = options.keyGenerator
                ? options.keyGenerator(req)
                : generateDefaultCacheKey(req);

            // Try to get cached response
            const cachedResponse = await cacheService.get(cacheKey, options);

            if (cachedResponse) {
                logger.debug(`Cache hit for key: ${cacheKey}`);
                res.set('X-Cache', 'HIT');
                res.json(cachedResponse);
                return;
            }

            // No cache hit, continue with request
            logger.debug(`Cache miss for key: ${cacheKey}`);
            res.set('X-Cache', 'MISS');

            // Override res.json to cache the response
            const originalJson = res.json;
            res.json = function (data: any) {
                // Only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    cacheService.set(cacheKey, data, options).catch(error => {
                        logger.error('Failed to cache response:', error);
                    });
                }

                return originalJson.call(this, data);
            };

            next();
        } catch (error) {
            logger.error('Cache middleware error:', error);
            // Fail open - continue with request if caching fails
            next();
        }
    };
};

/**
 * Cache invalidation middleware
 */
export const createCacheInvalidationMiddleware = (patterns: string[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Store original res.end to trigger invalidation after response
        const originalEnd = res.end;

        res.end = function (this: Response, ...args: any[]): any {
            // Only invalidate on successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Run invalidation async to not block response
                setImmediate(async () => {
                    try {
                        for (const pattern of patterns) {
                            const resolvedPattern = resolvePattern(pattern, req);
                            await cacheService.invalidatePattern(resolvedPattern);
                        }
                    } catch (error) {
                        logger.error('Cache invalidation error:', error);
                    }
                });
            }

            return (originalEnd as any).apply(this, args);
        } as any;

        next();
    };
};

/**
 * Generate default cache key from request
 */
function generateDefaultCacheKey(req: Request): string {
    const userId = (req as any).user?.id || 'anonymous';
    const path = req.path;
    const query = JSON.stringify(req.query);
    const queryHash = require('crypto').createHash('md5').update(query).digest('hex');

    return `${userId}:${path}:${queryHash}`;
}

/**
 * Resolve cache invalidation pattern with request context
 */
function resolvePattern(pattern: string, req: Request): string {
    return pattern
        .replace('{userId}', (req as any).user?.id || '*')
        .replace('{accountId}', req.params.accountId || '*');
}

/**
 * Middleware for transaction list caching
 */
export const transactionCacheMiddleware = createCacheMiddleware({
    ttl: 300, // 5 minutes
    keyGenerator: (req) => {
        const userId = (req as any).user?.id;
        return CacheService.transactionKey(userId, req.query);
    },
    condition: (req) => req.method === 'GET' && !!req.query,
});

/**
 * Middleware for user profile caching
 */
export const profileCacheMiddleware = createCacheMiddleware({
    ttl: 600, // 10 minutes
    keyGenerator: (req) => {
        const userId = (req as any).user?.id;
        return CacheService.profileKey(userId);
    },
});

/**
 * Middleware for account summary caching
 */
export const accountSummaryCacheMiddleware = createCacheMiddleware({
    ttl: 180, // 3 minutes
    keyGenerator: (req) => {
        const userId = (req as any).user?.id;
        const accountId = req.params.accountId;
        return CacheService.accountKey(userId, accountId);
    },
});

/**
 * Cache invalidation for transaction operations
 */
export const transactionCacheInvalidation = createCacheInvalidationMiddleware([
    'cache:transactions:{userId}*',
    'cache:account:*', // Invalidate account summaries
]);

/**
 * Cache invalidation for user profile updates
 */
export const profileCacheInvalidation = createCacheInvalidationMiddleware([
    'cache:profile:{userId}',
]);

/**
 * Cache invalidation for account operations
 */
export const accountCacheInvalidation = createCacheInvalidationMiddleware([
    'cache:accounts:{userId}*',
    'cache:account:*',
]);

export default {
    createCacheMiddleware,
    createCacheInvalidationMiddleware,
    transactionCacheMiddleware,
    profileCacheMiddleware,
    accountSummaryCacheMiddleware,
    transactionCacheInvalidation,
    profileCacheInvalidation,
    accountCacheInvalidation,
};
