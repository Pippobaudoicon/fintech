import { beforeAll, afterAll } from '@jest/globals';
import prisma from '../src/config/database';

beforeAll(async () => {
  // Setup test database if needed
});

afterAll(async () => {
  await prisma.$disconnect();
});
