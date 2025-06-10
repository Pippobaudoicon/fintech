import redisClient from '../config/redis';
import config from '../config/config';
import logger from '../utils/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
}

export class CacheService {
  private readonly DEFAULT_TTL = config.cache.defaultTtl;
  private readonly CACHE_PREFIX = 'cache:';
  private stats: CacheStats = { hits: 0, misses: 0, keys: 0 };

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      const cachedValue = await redisClient.get(cacheKey);

      if (cachedValue) {
        this.stats.hits++;
        logger.debug(`Cache hit for key: ${cacheKey}`);
        return JSON.parse(cachedValue);
      }

      this.stats.misses++;
      logger.debug(`Cache miss for key: ${cacheKey}`);
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T = any>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      const ttl = options?.ttl || this.DEFAULT_TTL;
      const serializedValue = JSON.stringify(value);

      await redisClient.set(cacheKey, serializedValue, 'EX', ttl);
      
      logger.debug(`Cache set for key: ${cacheKey}, TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      const result = await redisClient.del(cacheKey);
      
      logger.debug(`Cache delete for key: ${cacheKey}`);
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      const result = await redisClient.exists(cacheKey);
      return result > 0;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get or set a value in cache (cache-aside pattern)
   */
  async getOrSet<T = any>(
    key: string,
    fetchFunction: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T | null> {
    try {
      // Try to get from cache first
      const cachedValue = await this.get<T>(key, options);
      if (cachedValue !== null) {
        return cachedValue;
      }

      // Fetch from source
      const freshValue = await fetchFunction();
      if (freshValue !== null && freshValue !== undefined) {
        // Store in cache
        await this.set(key, freshValue, options);
      }

      return freshValue;
    } catch (error) {
      logger.error('Cache getOrSet error:', error);
      return null;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string, options?: CacheOptions): Promise<number> {
    try {
      const cachePattern = this.buildKey(pattern, options?.prefix);
      const keys = await redisClient.keys(cachePattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const deleted = await Promise.all(
        keys.map(key => redisClient.del(key))
      );

      const totalDeleted = deleted.reduce((sum, count) => sum + count, 0);
      logger.info(`Invalidated ${totalDeleted} cache entries matching pattern: ${cachePattern}`);
      return totalDeleted;
    } catch (error) {
      logger.error('Cache invalidate pattern error:', error);
      return 0;
    }
  }

  /**
   * Increment a counter in cache
   */
  async increment(key: string, options?: CacheOptions): Promise<number> {
    try {
      const cacheKey = this.buildKey(key, options?.prefix);
      const result = await redisClient.incr(cacheKey);
      
      // Set TTL if it's a new key
      if (result === 1) {
        const ttl = options?.ttl || this.DEFAULT_TTL;
        await redisClient.expire(cacheKey, ttl);
      }
      
      return result;
    } catch (error) {
      logger.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string, prefix?: string): string {
    const keyPrefix = prefix || this.CACHE_PREFIX;
    return `${keyPrefix}${key}`;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, keys: 0 };
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      await redisClient.flushall();
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  /**
   * Generate cache key for user-specific data
   */
  static userKey(userId: string, key: string): string {
    return `user:${userId}:${key}`;
  }

  /**
   * Generate cache key for transaction data
   */
  static transactionKey(userId: string, filters?: Record<string, any>): string {
    let key = `transactions:${userId}`;
    
    if (filters && Object.keys(filters).length > 0) {
      const filterStr = Object.entries(filters)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join('|');
      key += `:${filterStr}`;
    }
    
    return key;
  }

  /**
   * Generate cache key for account data
   */
  static accountKey(userId: string, accountId?: string): string {
    return accountId ? `account:${accountId}` : `accounts:${userId}`;
  }

  /**
   * Generate cache key for user profile
   */
  static profileKey(userId: string): string {
    return `profile:${userId}`;
  }
}

// Singleton instance
export const cacheService = new CacheService();
export default CacheService;
