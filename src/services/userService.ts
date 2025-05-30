import prisma from '../config/database';
import { hashPassword, comparePassword, generateToken, sanitizeUser } from '../utils/helpers';
import { CreateUserRequest, LoginRequest } from '../types';
import { UserRole } from '@prisma/client';

export class UserService {
  async createUser(userData: CreateUserRequest) {
    const hashedPassword = await hashPassword(userData.password);
    
    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : null,
      },
    });

    return sanitizeUser(user);
  }

  async authenticateUser(credentials: LoginRequest) {
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await comparePassword(credentials.password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });
    
    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: sanitizeUser(user),
      token,
    };
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        accounts: true,
        _count: {
          select: {
            transactions: true,
            notifications: { where: { isRead: false } },
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return sanitizeUser(user);
  }

  async updateUser(id: string, updateData: Partial<CreateUserRequest>) {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...updateData,
        dateOfBirth: updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : undefined,
      },
    });

    return sanitizeUser(user);
  }

  async deactivateUser(id: string) {
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getAllUsers(page: number, limit: number, skip: number) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          kycStatus: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              accounts: true,
              transactions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    return { users, total };
  }

  async updateUserRole(id: string, role: UserRole) {
    const user = await prisma.user.update({
      where: { id },
      data: { role },
    });

    return sanitizeUser(user);
  }

  async logout(token: string) {
    await prisma.session.deleteMany({
      where: { token },
    });
  }

  async getUserNotifications(userId: string, page: number, limit: number, skip: number) {
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    return { notifications, total };
  }

  async markNotificationAsRead(userId: string, notificationId: string) {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllNotificationsAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId },
      data: { isRead: true },
    });
  }
}
