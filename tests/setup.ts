import { beforeAll, afterAll } from '@jest/globals';
import prisma from '../src/config/database';
import redisClient from '../src/config/redis';

// Mock Redis for testing if no Redis is available
jest.mock('../src/config/redis', () => {
  const mockStorage = new Map();
  const mockHashStorage = new Map();

  const mockRedisClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(false),
    get: jest.fn().mockImplementation((key) => Promise.resolve(mockStorage.get(key) || null)),
    set: jest.fn().mockImplementation((key, value, ttl) => {
      mockStorage.set(key, value);
      return Promise.resolve(true);
    }),
    del: jest.fn().mockImplementation((key) => {
      const existed = mockStorage.has(key) || mockHashStorage.has(key);
      mockStorage.delete(key);
      mockHashStorage.delete(key);
      return Promise.resolve(existed ? 1 : 0);
    }),
    exists: jest.fn().mockImplementation((key) => Promise.resolve(mockStorage.has(key) ? 1 : 0)),
    expire: jest.fn().mockResolvedValue(true),
    incr: jest.fn().mockResolvedValue(1),
    hGet: jest.fn().mockImplementation((key, field) => {
      const hash = mockHashStorage.get(key) || {};
      return Promise.resolve(hash[field] || null);
    }),
    hSet: jest.fn().mockImplementation((key, field, value) => {
      const hash = mockHashStorage.get(key) || {};
      hash[field] = value;
      mockHashStorage.set(key, hash);
      return Promise.resolve(true);
    }),
    hDel: jest.fn().mockImplementation((key, field) => {
      const hash = mockHashStorage.get(key) || {};
      const existed = field in hash;
      delete hash[field];
      mockHashStorage.set(key, hash);
      return Promise.resolve(existed ? 1 : 0);
    }),
    hGetAll: jest.fn().mockImplementation((key) => {
      return Promise.resolve(mockHashStorage.get(key) || {});
    }),
    keys: jest.fn().mockImplementation((pattern) => {
      const allKeys = [...mockStorage.keys(), ...mockHashStorage.keys()];
      if (pattern === '*') return Promise.resolve(allKeys);
      // Simple pattern matching for cache:* patterns
      const regex = new RegExp(pattern.replace('*', '.*'));
      return Promise.resolve(allKeys.filter(key => regex.test(key)));
    }),
    slidingWindowRateLimit: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetTime: Date.now() + 60000
    }),
    getClient: jest.fn().mockReturnValue({
      ping: jest.fn().mockResolvedValue('PONG')
    })
  };
  return mockRedisClient;
});

beforeAll(async () => {
  // Setup test database if needed
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.TRUST_PROXY = 'true';

  // Try to connect to Redis (will use mock if not available)
  try {
    await redisClient.connect();
  } catch (error) {
    console.log('Using mocked Redis for tests');
  }
});

afterAll(async () => {
  await prisma.$disconnect();
  try {
    await redisClient.disconnect();
  } catch (error) {
    // Ignore disconnection errors in tests
  }
});
