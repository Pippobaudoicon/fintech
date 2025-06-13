import { server } from './app';
import config from './config/config';
import logger from './utils/logger';
import prisma from './config/database';
import { connectRedis } from './config/redis';

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connection established successfully');

    // Initialize Redis connection
    await connectRedis();
    logger.info('Redis connection established successfully');

    // Start server
    server.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port} in ${config.nodeEnv} mode`);
      logger.info(`📚 API Documentation available at http://localhost:${config.port}/api-docs`);
      logger.info(`🔗 Health check available at http://localhost:${config.port}/api/v1/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
