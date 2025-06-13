import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import config from './config/config';
import { connectRedis } from './config/redis';
import { swaggerSpec, swaggerUi, swaggerUiOptions } from './config/swagger';
import {
  securityMiddleware,
  requestLogger,
  errorHandler,
  notFound,
  createRateLimit,
  createRedisRateLimit,
  requestProfiler,
} from './middleware';
import routes from './routes';
import logger from './utils/logger';
import prisma from './config/database';

const app = express();

// Trust proxy for nginx
app.set('trust proxy', true);

const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin:
      config.nodeEnv === 'production'
        ? ['https://yourdomain.com']
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
});

// Global middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(securityMiddleware);
app.use(requestProfiler(500));

// Global rate limiting with Redis
app.use(
  createRedisRateLimit({
    windowMs: config.rateLimit.windowMs,
    maxRequests: config.rateLimit.maxRequests,
    message: 'Too many requests from this IP, please try again later',
  }),
);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Serve OpenAPI JSON specification
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API routes
app.use('/api/v1', routes);

// Socket.IO for real-time notifications
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-user-room', (userId: string) => {
    socket.join(`user-${userId}`);
    logger.info(`User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io accessible in other parts of the application
app.set('io', io);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Starting graceful shutdown...');

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      await prisma.$disconnect();
      logger.info('Database connection closed');

      // Disconnect Redis
      const { disconnectRedis } = await import('./config/redis');
      await disconnectRedis();
      logger.info('Redis connection closed');

      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export { app, server, io };
export default app;
