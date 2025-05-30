import { PrismaClient } from '@prisma/client';
import config from './config';

let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

if (config.nodeEnv === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  prisma = global.__prisma;
}

export default prisma;
