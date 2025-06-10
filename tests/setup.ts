import { beforeAll, afterAll } from '@jest/globals';
import prisma from '../src/config/database';

beforeAll(async () => {
  // Setup test database if needed
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.TRUST_PROXY = 'true';
});

afterAll(async () => {
  await prisma.$disconnect();
});
