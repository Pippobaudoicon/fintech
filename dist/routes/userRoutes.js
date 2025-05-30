"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const middleware_1 = require("../middleware");
const validators_1 = require("../validators");
const router = (0, express_1.Router)();
const userController = new userController_1.UserController();
// Public routes
router.post('/register', (0, middleware_1.createRateLimit)(15 * 60 * 1000, 5), validators_1.registerValidation, middleware_1.validate, userController.register);
router.post('/login', (0, middleware_1.createRateLimit)(15 * 60 * 1000, 10), validators_1.loginValidation, middleware_1.validate, userController.login);
// Protected routes
router.use(auth_1.authenticate);
router.post('/logout', userController.logout);
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
// Notifications
router.get('/notifications', validators_1.paginationValidation, middleware_1.validate, userController.getNotifications);
router.patch('/notifications/:notificationId/read', userController.markNotificationAsRead);
router.patch('/notifications/read-all', userController.markAllNotificationsAsRead);
// Admin routes
router.use((0, auth_1.authorize)('ADMIN'));
router.get('/', validators_1.paginationValidation, middleware_1.validate, userController.getAllUsers);
router.get('/:id', validators_1.idValidation, middleware_1.validate, userController.getUserById);
router.patch('/:id/role', validators_1.idValidation, middleware_1.validate, userController.updateUserRole);
router.delete('/:id', validators_1.idValidation, middleware_1.validate, userController.deactivateUser);
exports.default = router;
//# sourceMappingURL=userRoutes.js.map