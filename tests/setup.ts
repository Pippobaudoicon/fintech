import { beforeAll, afterAll } from '@jest/globals';
import prisma from '../src/config/database';

beforeAll(async () => {
  // Setup test database if needed
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.TRUST_PROXY = 'true';

  // Rate limiting test configurations
  process.env.RATE_LIMIT_WINDOW_MS = '60000';
  process.env.RATE_LIMIT_MAX_REQUESTS = '100';
  process.env.AUTH_RATE_LIMIT_WINDOW_MS = '900000';
  process.env.AUTH_RATE_LIMIT_MAX_REQUESTS = '5';
  process.env.FINANCIAL_RATE_LIMIT_WINDOW_MS = '60000';
  process.env.FINANCIAL_RATE_LIMIT_MAX_REQUESTS = '10';
});

afterAll(async () => {
  await prisma.$disconnect();

  // Disconnect Redis if connected
  try {
    const { disconnectRedis } = await import('../src/config/redis');
    await disconnectRedis();
  } catch (error) {
    // Ignore errors during cleanup
  }
});
