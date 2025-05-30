import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';
import { validate, createRateLimit } from '../middleware';
import { registerValidation, loginValidation, paginationValidation, idValidation } from '../validators';

const router = Router();
const userController = new UserController();

// Public routes - Temporarily increased rate limits for testing
router.post('/register', createRateLimit(60 * 1000, 1000), registerValidation, validate, userController.register);
router.post('/login', createRateLimit(60 * 1000, 1000), loginValidation, validate, userController.login);

// Protected routes
router.use(authenticate);
router.post('/logout', userController.logout);
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// Notifications
router.get('/notifications', paginationValidation, validate, userController.getNotifications);
router.patch('/notifications/:notificationId/read', userController.markNotificationAsRead);
router.patch('/notifications/read-all', userController.markAllNotificationsAsRead);

// Admin routes
router.use(authorize('ADMIN'));
router.get('/', paginationValidation, validate, userController.getAllUsers);
router.get('/:id', idValidation, validate, userController.getUserById);
router.patch('/:id/role', idValidation, validate, userController.updateUserRole);
router.delete('/:id', idValidation, validate, userController.deactivateUser);

export default router;
