import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/helpers';
import { AuthenticatedRequest } from '../types';
import { sessionService } from '../services/sessionService';
import prisma from '../config/database';
import logger from '../utils/logger';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json(errorResponse('Access token required'));
      return;
    }

    const token = authHeader.substring(7);
    
    // Validate session using session service
    const sessionData = await sessionService.validateSession(token);

    if (!sessionData) {
      res.status(401).json(errorResponse('Invalid or expired token'));
      return;
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json(errorResponse('Invalid or inactive user'));
      return;
    }

    // Attach user and session info to request
    req.user = user;
    req.session = sessionData;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json(errorResponse('Invalid token'));
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(errorResponse('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json(errorResponse('Insufficient permissions'));
      return;
    }

    next();
  };
};

export const auditLog = (action: string, resource: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await prisma.auditLog.create({
        data: {
          action,
          resource,
          details: {
            method: req.method,
            url: req.url,
            body: req.body,
            params: req.params,
            query: req.query,
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          userId: req.user?.id,
        },
      });
    } catch (error) {
      logger.error('Audit log error:', error);
    }
    next();
  };
};
