"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const database_1 = __importDefault(require("../config/database"));
const helpers_1 = require("../utils/helpers");
class UserService {
    async createUser(userData) {
        const hashedPassword = await (0, helpers_1.hashPassword)(userData.password);
        const user = await database_1.default.user.create({
            data: {
                ...userData,
                password: hashedPassword,
                dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : null,
            },
        });
        return (0, helpers_1.sanitizeUser)(user);
    }
    async authenticateUser(credentials) {
        const user = await database_1.default.user.findUnique({
            where: { email: credentials.email },
        });
        if (!user || !user.isActive) {
            throw new Error('Invalid credentials');
        }
        const isValidPassword = await (0, helpers_1.comparePassword)(credentials.password, user.password);
        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }
        const token = (0, helpers_1.generateToken)({ userId: user.id, email: user.email, role: user.role });
        // Create session
        await database_1.default.session.create({
            data: {
                userId: user.id,
                token,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
        });
        return {
            user: (0, helpers_1.sanitizeUser)(user),
            token,
        };
    }
    async getUserById(id) {
        const user = await database_1.default.user.findUnique({
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
        return (0, helpers_1.sanitizeUser)(user);
    }
    async updateUser(id, updateData) {
        const user = await database_1.default.user.update({
            where: { id },
            data: {
                ...updateData,
                dateOfBirth: updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : undefined,
            },
        });
        return (0, helpers_1.sanitizeUser)(user);
    }
    async deactivateUser(id) {
        await database_1.default.user.update({
            where: { id },
            data: { isActive: false },
        });
    }
    async getAllUsers(page, limit, skip) {
        const [users, total] = await Promise.all([
            database_1.default.user.findMany({
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
            database_1.default.user.count(),
        ]);
        return { users, total };
    }
    async updateUserRole(id, role) {
        const user = await database_1.default.user.update({
            where: { id },
            data: { role },
        });
        return (0, helpers_1.sanitizeUser)(user);
    }
    async logout(token) {
        await database_1.default.session.deleteMany({
            where: { token },
        });
    }
    async getUserNotifications(userId, page, limit, skip) {
        const [notifications, total] = await Promise.all([
            database_1.default.notification.findMany({
                where: { userId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            database_1.default.notification.count({ where: { userId } }),
        ]);
        return { notifications, total };
    }
    async markNotificationAsRead(userId, notificationId) {
        await database_1.default.notification.updateMany({
            where: { id: notificationId, userId },
            data: { isRead: true },
        });
    }
    async markAllNotificationsAsRead(userId) {
        await database_1.default.notification.updateMany({
            where: { userId },
            data: { isRead: true },
        });
    }
}
exports.UserService = UserService;
//# sourceMappingURL=userService.js.map