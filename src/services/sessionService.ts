import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import redisClient from '../config/redis';
import config from '../config/config';
import logger from '../utils/logger';
import prisma from '../config/database';

export interface SessionData {
  userId: string;
  email: string;
  sessionId: string;
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
}

export interface DeviceInfo {
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface CreateSessionResponse {
  token: string;
  sessionId: string;
  expiresAt: Date;
}

class SessionService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  private readonly BLACKLIST_PREFIX = 'blacklist:';
  private readonly SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  /**
   * Create a new session for a user
   */
  async createSession(
    userId: string,
    email: string,
    deviceInfo?: DeviceInfo
  ): Promise<CreateSessionResponse> {
    try {
      const sessionId = randomUUID();
      const expiresAt = new Date(Date.now() + this.SESSION_TTL * 1000);

      // Create session data
      const sessionData: SessionData = {
        userId,
        email,
        sessionId,
        deviceId: deviceInfo?.deviceId,
        userAgent: deviceInfo?.userAgent,
        ipAddress: deviceInfo?.ipAddress,
        createdAt: new Date(),
      };

      // Store session in Redis
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      await redisClient.set(
        sessionKey,
        JSON.stringify(sessionData),
        'EX',
        this.SESSION_TTL
      );

      // Add session to user's session list
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
      await redisClient.sadd(userSessionsKey, sessionId);
      await redisClient.expire(userSessionsKey, this.SESSION_TTL);

      // Store session in database for persistence
      await prisma.session.create({
        data: {
          id: sessionId,
          userId,
          token: sessionId, // We'll use sessionId as token reference
          expiresAt,
          deviceId: deviceInfo?.deviceId,
          userAgent: deviceInfo?.userAgent,
          ipAddress: deviceInfo?.ipAddress,
        },
      });

      // Create JWT token
      const tokenPayload = {
        userId,
        email,
        sessionId,
        exp: Math.floor(expiresAt.getTime() / 1000),
      };

      const token = jwt.sign(tokenPayload, config.jwtSecret);

      logger.info(`Session created for user ${userId}`, { sessionId });

      return {
        token,
        sessionId,
        expiresAt,
      };
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Validate a session token
   */
  async validateSession(token: string): Promise<SessionData | null> {
    try {
      // Check if token is blacklisted
      const blacklistKey = `${this.BLACKLIST_PREFIX}${token}`;
      const isBlacklisted = await redisClient.exists(blacklistKey);
      if (isBlacklisted) {
        return null;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      const { userId, email, sessionId } = decoded;

      // Check session in Redis
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      const sessionDataStr = await redisClient.get(sessionKey);

      if (!sessionDataStr) {
        // Session not found in Redis, check database
        const dbSession = await prisma.session.findUnique({
          where: { id: sessionId },
          include: { user: true },
        });

        if (!dbSession || dbSession.expiresAt < new Date()) {
          return null;
        }

        // Restore session to Redis
        const sessionData: SessionData = {
          userId: dbSession.userId,
          email: dbSession.user.email,
          sessionId: dbSession.id,
          deviceId: dbSession.deviceId || undefined,
          userAgent: dbSession.userAgent || undefined,
          ipAddress: dbSession.ipAddress || undefined,
          createdAt: dbSession.createdAt,
        };

        await redisClient.set(
          sessionKey,
          JSON.stringify(sessionData),
          'EX',
          Math.floor((dbSession.expiresAt.getTime() - Date.now()) / 1000)
        );

        return sessionData;
      }

      const sessionData: SessionData = JSON.parse(sessionDataStr);
      return sessionData;
    } catch (error) {
      logger.warn('Session validation failed:', error);
      return null;
    }
  }

  /**
   * Blacklist a token (logout)
   */
  async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      const { sessionId, exp } = decoded;

      // Add token to blacklist
      const blacklistKey = `${this.BLACKLIST_PREFIX}${token}`;
      const ttl = exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redisClient.set(blacklistKey, '1', 'EX', ttl);
      }

      // Remove session from Redis
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      await redisClient.del(sessionKey);

      // Remove from user sessions set
      if (decoded.userId) {
        const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${decoded.userId}`;
        await redisClient.srem(userSessionsKey, sessionId);
      }

      // Mark session as expired in database
      await prisma.session.update({
        where: { id: sessionId },
        data: { expiresAt: new Date() },
      });

      logger.info(`Token blacklisted for session ${sessionId}`);
    } catch (error) {
      logger.error('Failed to blacklist token:', error);
      throw new Error('Failed to logout');
    }
  }

  /**
   * Terminate all sessions for a user
   */
  async terminateAllUserSessions(userId: string): Promise<number> {
    try {
      // Get all user sessions from Redis
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
      const sessionIds = await redisClient.smembers(userSessionsKey);

      let terminatedCount = 0;

      // Blacklist all active sessions
      for (const sessionId of sessionIds) {
        const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
        const sessionDataStr = await redisClient.get(sessionKey);

        if (sessionDataStr) {
          // Remove session from Redis
          await redisClient.del(sessionKey);
          terminatedCount++;
        }
      }

      // Clear user sessions set
      await redisClient.del(userSessionsKey);

      // Update all user sessions in database to expired
      const result = await prisma.session.updateMany({
        where: {
          userId,
          expiresAt: { gt: new Date() },
        },
        data: { expiresAt: new Date() },
      });

      terminatedCount = Math.max(terminatedCount, result.count);

      logger.info(`Terminated ${terminatedCount} sessions for user ${userId}`);
      return terminatedCount;
    } catch (error) {
      logger.error('Failed to terminate user sessions:', error);
      throw new Error('Failed to terminate sessions');
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
      const sessionIds = await redisClient.smembers(userSessionsKey);

      const sessions: SessionData[] = [];

      for (const sessionId of sessionIds) {
        const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
        const sessionDataStr = await redisClient.get(sessionKey);

        if (sessionDataStr) {
          const sessionData: SessionData = JSON.parse(sessionDataStr);
          sessions.push(sessionData);
        }
      }

      return sessions;
    } catch (error) {
      logger.error('Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      // This is mainly handled by Redis TTL, but we can clean up database
      await prisma.session.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      logger.info('Cleaned up expired sessions from database');
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
    }
  }
}

export const sessionService = new SessionService();
export default SessionService;
