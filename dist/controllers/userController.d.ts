import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
export declare class UserController {
    private userService;
    register: (req: Request, res: Response) => Promise<void>;
    login: (req: Request, res: Response) => Promise<void>;
    logout: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getProfile: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    updateProfile: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getAllUsers: (req: Request, res: Response) => Promise<void>;
    getUserById: (req: Request, res: Response) => Promise<void>;
    updateUserRole: (req: Request, res: Response) => Promise<void>;
    deactivateUser: (req: Request, res: Response) => Promise<void>;
    getNotifications: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    markNotificationAsRead: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    markAllNotificationsAsRead: (req: AuthenticatedRequest, res: Response) => Promise<void>;
}
//# sourceMappingURL=userController.d.ts.map