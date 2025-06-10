import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  redis: {
    url: string;
    host: string;
    port: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    authWindowMs: number;
    authMaxRequests: number;
    financialWindowMs: number;
    financialMaxRequests: number;
  };
  logLevel: string;
  paymentProvider: {
    apiKey: string;
    secret: string;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute window for testing
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000', 10), // 10,000 requests per minute for testing
    authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5', 10), // 5 attempts
    financialWindowMs: parseInt(process.env.FINANCIAL_RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    financialMaxRequests: parseInt(process.env.FINANCIAL_RATE_LIMIT_MAX_REQUESTS || '10', 10), // 10 operations
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  paymentProvider: {
    apiKey: process.env.PAYMENT_PROVIDER_API_KEY || '',
    secret: process.env.PAYMENT_PROVIDER_SECRET || '',
  },
};

export default config;
