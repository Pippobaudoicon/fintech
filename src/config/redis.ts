import Redis from 'ioredis';
import config from './config';
import logger from '../utils/logger';

// Redis client instance
let redisClient: Redis | MockRedis;

// Mock Redis for testing
class MockRedis {
  private store: Map<string, { value: string; expiry?: number }> = new Map();
  private sets: Map<string, Set<string>> = new Map();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: string, exMode?: string, exValue?: number): Promise<'OK'> {
    const expiry = exMode === 'EX' && exValue ? Date.now() + (exValue * 1000) : undefined;
    this.store.set(key, { value, expiry });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const deleted = this.store.delete(key);
    const setDeleted = this.sets.delete(key);
    return (deleted || setDeleted) ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    const item = this.store.get(key);
    if (item) {
      if (item.expiry && Date.now() > item.expiry) {
        this.store.delete(key);
        return 0;
      }
      return 1;
    }
    
    return this.sets.has(key) ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const storeKeys = Array.from(this.store.keys()).filter(key => regex.test(key));
    const setKeys = Array.from(this.sets.keys()).filter(key => regex.test(key));
    return [...storeKeys, ...setKeys];
  }

  async flushall(): Promise<'OK'> {
    this.store.clear();
    this.sets.clear();
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const newValue = (parseInt(current || '0') + 1).toString();
    await this.set(key, newValue);
    return parseInt(newValue);
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (item) {
      item.expiry = Date.now() + (seconds * 1000);
      return 1;
    }
    
    if (this.sets.has(key)) {
      // For sets, we'll simulate expiry by setting a timeout
      setTimeout(() => {
        this.sets.delete(key);
      }, seconds * 1000);
      return 1;
    }
    
    return 0;
  }

  // Set operations for session management
  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key)!;
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    return added;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    
    let removed = 0;
    for (const member of members) {
      if (set.delete(member)) {
        removed++;
      }
    }
    
    if (set.size === 0) {
      this.sets.delete(key);
    }
    
    return removed;
  }
  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  // Sorted set operations for rate limiting
  async zadd(key: string, score: string, member: string): Promise<number> {
    if (!this.store.has(key)) {
      this.store.set(key, { value: JSON.stringify([]), expiry: undefined });
    }
    
    const item = this.store.get(key)!;
    const sortedSet = JSON.parse(item.value) as Array<{ score: number; member: string }>;
    
    // Remove existing member if present
    const existingIndex = sortedSet.findIndex(item => item.member === member);
    if (existingIndex >= 0) {
      sortedSet.splice(existingIndex, 1);
    }
    
    // Add new member
    sortedSet.push({ score: parseFloat(score), member });
    sortedSet.sort((a, b) => a.score - b.score);
    
    item.value = JSON.stringify(sortedSet);
    return existingIndex >= 0 ? 0 : 1; // Return 0 if updated, 1 if added
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;
    
    const sortedSet = JSON.parse(item.value) as Array<{ score: number; member: string }>;
    const initialLength = sortedSet.length;
    
    const filtered = sortedSet.filter(item => item.score < min || item.score > max);
    
    if (filtered.length === 0) {
      this.store.delete(key);
    } else {
      item.value = JSON.stringify(filtered);
    }
    
    return initialLength - filtered.length;
  }

  async zcard(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;
    
    const sortedSet = JSON.parse(item.value) as Array<{ score: number; member: string }>;
    return sortedSet.length;
  }

  async zrange(key: string, start: number, stop: number, withScores?: string): Promise<string[]> {
    const item = this.store.get(key);
    if (!item) return [];
    
    const sortedSet = JSON.parse(item.value) as Array<{ score: number; member: string }>;
    const slice = sortedSet.slice(start, stop + 1);
    
    if (withScores === 'WITHSCORES') {
      const result: string[] = [];
      for (const item of slice) {
        result.push(item.member, item.score.toString());
      }
      return result;
    }
    
    return slice.map(item => item.member);
  }

  async zrem(key: string, member: string): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;
    
    const sortedSet = JSON.parse(item.value) as Array<{ score: number; member: string }>;
    const index = sortedSet.findIndex(item => item.member === member);
    
    if (index >= 0) {
      sortedSet.splice(index, 1);
      if (sortedSet.length === 0) {
        this.store.delete(key);
      } else {
        item.value = JSON.stringify(sortedSet);
      }
      return 1;
    }
    
    return 0;
  }

  // Mock methods for compatibility
  quit() { return Promise.resolve('OK'); }
  disconnect() { return; }
}

// Initialize Redis client
const initializeRedis = (): Redis | MockRedis => {
  if (process.env.NODE_ENV === 'test') {
    logger.info('Using mock Redis for testing');
    return new MockRedis() as any;
  }

  try {    const client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    client.on('connect', () => {
      logger.info('Connected to Redis');
    });

    client.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    client.on('ready', () => {
      logger.info('Redis is ready');
    });

    return client;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    throw error;
  }
};

redisClient = initializeRedis();

export default redisClient;
