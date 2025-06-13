import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { AuthenticatedRequest } from '../types';
import {
  successResponse,
  errorResponse,
  parsePageAndLimit,
  calculatePagination,
} from '../utils/helpers';
import logger from '../utils/logger';

export class UserController {
  private userService = new UserService();
  register = async (req: Request, res: Response) => {
    try {
      const user = await this.userService.createUser(req.body);
      res.status(201).json(successResponse('User registered successfully', user));
    } catch (error: any) {
      logger.error('Registration error:', error);
      if (error.message && error.message.includes('email')) {
        res
          .status(409)
          .json(
            errorResponse(
              'Email already exists',
              'A user with this email address is already registered',
            ),
          );
        return;
      }
      res.status(400).json(errorResponse('Registration failed', error.message));
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const result = await this.userService.authenticateUser(req.body);
      res.json(successResponse('Login successful', result));
    } catch (error: any) {
      logger.error('Login error:', error);
      res.status(401).json(errorResponse('Invalid credentials', error.message));
    }
  };

  logout = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const token = req.headers.authorization?.substring(7);
      if (token) {
        await this.userService.logout(token);
      }
      res.json(successResponse('Logout successful'));
    } catch (error: any) {
      logger.error('Logout error:', error);
      res.status(500).json(errorResponse('Logout failed', error.message));
    }
  };

  getProfile = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await this.userService.getUserById(req.user!.id);
      res.json(successResponse('Profile retrieved successfully', user));
    } catch (error: any) {
      logger.error('Get profile error:', error);
      res.status(404).json(errorResponse('User not found', error.message));
    }
  };

  updateProfile = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await this.userService.updateUser(req.user!.id, req.body);
      res.json(successResponse('Profile updated successfully', user));
    } catch (error: any) {
      logger.error('Update profile error:', error);
      res.status(400).json(errorResponse('Profile update failed', error.message));
    }
  };

  getAllUsers = async (req: Request, res: Response) => {
    try {
      const { page, limit, skip } = parsePageAndLimit(
        req.query.page as string,
        req.query.limit as string,
      );
      const { users, total } = await this.userService.getAllUsers(page, limit, skip);
      const pagination = calculatePagination(total, page, limit);

      res.json(successResponse('Users retrieved successfully', users, pagination));
    } catch (error: any) {
      logger.error('Get all users error:', error);
      res.status(500).json(errorResponse('Failed to retrieve users', error.message));
    }
  };

  getUserById = async (req: Request, res: Response) => {
    try {
      const user = await this.userService.getUserById(req.params.id);
      res.json(successResponse('User retrieved successfully', user));
    } catch (error: any) {
      logger.error('Get user by ID error:', error);
      res.status(404).json(errorResponse('User not found', error.message));
    }
  };

  updateUserRole = async (req: Request, res: Response) => {
    try {
      const { role } = req.body;
      const user = await this.userService.updateUserRole(req.params.id, role);
      res.json(successResponse('User role updated successfully', user));
    } catch (error: any) {
      logger.error('Update user role error:', error);
      res.status(400).json(errorResponse('Failed to update user role', error.message));
    }
  };

  deactivateUser = async (req: Request, res: Response) => {
    try {
      await this.userService.deactivateUser(req.params.id);
      res.json(successResponse('User deactivated successfully'));
    } catch (error: any) {
      logger.error('Deactivate user error:', error);
      res.status(400).json(errorResponse('Failed to deactivate user', error.message));
    }
  };

  getNotifications = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page, limit, skip } = parsePageAndLimit(
        req.query.page as string,
        req.query.limit as string,
      );
      const { notifications, total } = await this.userService.getUserNotifications(
        req.user!.id,
        page,
        limit,
        skip,
      );
      const pagination = calculatePagination(total, page, limit);

      res.json(successResponse('Notifications retrieved successfully', notifications, pagination));
    } catch (error: any) {
      logger.error('Get notifications error:', error);
      res.status(500).json(errorResponse('Failed to retrieve notifications', error.message));
    }
  };

  markNotificationAsRead = async (req: AuthenticatedRequest, res: Response) => {
    try {
      await this.userService.markNotificationAsRead(req.user!.id, req.params.notificationId);
      res.json(successResponse('Notification marked as read'));
    } catch (error: any) {
      logger.error('Mark notification as read error:', error);
      res.status(400).json(errorResponse('Failed to mark notification as read', error.message));
    }
  };

  markAllNotificationsAsRead = async (req: AuthenticatedRequest, res: Response) => {
    try {
      await this.userService.markAllNotificationsAsRead(req.user!.id);
      res.json(successResponse('All notifications marked as read'));
    } catch (error: any) {
      logger.error('Mark all notifications as read error:', error);
      res.status(400).json(errorResponse('Failed to mark notifications as read', error.message));
    }
  };

  // List all active sessions for the current user
  listSessions = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessions = await this.userService.listSessions(req.user!.id);
      res.json(successResponse('Active sessions retrieved', sessions));
    } catch (error: any) {
      logger.error('List sessions error:', error);
      res.status(500).json(errorResponse('Failed to list sessions', error.message));
    }
  };

  // Revoke a specific session (logout from a device)
  revokeSession = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId } = req.params;
      await this.userService.revokeSession(req.user!.id, sessionId);
      res.json(successResponse('Session revoked'));
    } catch (error: any) {
      logger.error('Revoke session error:', error);
      res.status(500).json(errorResponse('Failed to revoke session', error.message));
    }
  };

  // Revoke all other sessions except the current one
  revokeAllOtherSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const currentToken = req.headers.authorization?.substring(7);
      if (!currentToken) {
        res.status(400).json(errorResponse('Current session token required'));
        return;
      }
      // Find current session
      const sessions = await this.userService.listSessions(req.user!.id);
      const session = sessions.find((s) => s.token === currentToken);
      if (!session) {
        res.status(404).json(errorResponse('Current session not found'));
        return;
      }
      await this.userService.revokeAllOtherSessions(req.user!.id, session.id);
      res.json(successResponse('All other sessions revoked'));
    } catch (error: any) {
      logger.error('Revoke all other sessions error:', error);
      res.status(500).json(errorResponse('Failed to revoke other sessions', error.message));
    }
  };
}
