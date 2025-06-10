import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  cache: {
    defaultTtl: number;
    maxKeys: number;
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
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute window for testing
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000', 10), // 10,000 requests per minute for testing
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  cache: {
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10), // 5 minutes
    maxKeys: parseInt(process.env.CACHE_MAX_KEYS || '10000', 10),
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  paymentProvider: {
    apiKey: process.env.PAYMENT_PROVIDER_API_KEY || '',
    secret: process.env.PAYMENT_PROVIDER_SECRET || '',
  },
};

export default config;
