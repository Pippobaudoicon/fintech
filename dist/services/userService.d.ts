import { CreateUserRequest, LoginRequest } from '../types';
import { UserRole } from '@prisma/client';
export declare class UserService {
    createUser(userData: CreateUserRequest): Promise<any>;
    authenticateUser(credentials: LoginRequest): Promise<{
        user: any;
        token: string;
    }>;
    getUserById(id: string): Promise<any>;
    updateUser(id: string, updateData: Partial<CreateUserRequest>): Promise<any>;
    deactivateUser(id: string): Promise<void>;
    getAllUsers(page: number, limit: number, skip: number): Promise<{
        users: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            role: import(".prisma/client").$Enums.UserRole;
            kycStatus: import(".prisma/client").$Enums.KYCStatus;
            isActive: boolean;
            createdAt: Date;
            _count: {
                accounts: number;
                transactions: number;
            };
        }[];
        total: number;
    }>;
    updateUserRole(id: string, role: UserRole): Promise<any>;
    logout(token: string): Promise<void>;
    getUserNotifications(userId: string, page: number, limit: number, skip: number): Promise<{
        notifications: {
            type: string;
            message: string;
            id: string;
            createdAt: Date;
            userId: string;
            title: string;
            isRead: boolean;
        }[];
        total: number;
    }>;
    markNotificationAsRead(userId: string, notificationId: string): Promise<void>;
    markAllNotificationsAsRead(userId: string): Promise<void>;
}
//# sourceMappingURL=userService.d.ts.map