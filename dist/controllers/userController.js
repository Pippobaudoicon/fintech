"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const userService_1 = require("../services/userService");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
class UserController {
    constructor() {
        this.userService = new userService_1.UserService();
        this.register = async (req, res) => {
            try {
                const user = await this.userService.createUser(req.body);
                res.status(201).json((0, helpers_1.successResponse)('User registered successfully', user));
            }
            catch (error) {
                logger_1.default.error('Registration error:', error);
                res.status(400).json((0, helpers_1.errorResponse)('Registration failed', error.message));
            }
        };
        this.login = async (req, res) => {
            try {
                const result = await this.userService.authenticateUser(req.body);
                res.json((0, helpers_1.successResponse)('Login successful', result));
            }
            catch (error) {
                logger_1.default.error('Login error:', error);
                res.status(401).json((0, helpers_1.errorResponse)('Invalid credentials', error.message));
            }
        };
        this.logout = async (req, res) => {
            try {
                const token = req.headers.authorization?.substring(7);
                if (token) {
                    await this.userService.logout(token);
                }
                res.json((0, helpers_1.successResponse)('Logout successful'));
            }
            catch (error) {
                logger_1.default.error('Logout error:', error);
                res.status(500).json((0, helpers_1.errorResponse)('Logout failed', error.message));
            }
        };
        this.getProfile = async (req, res) => {
            try {
                const user = await this.userService.getUserById(req.user.id);
                res.json((0, helpers_1.successResponse)('Profile retrieved successfully', user));
            }
            catch (error) {
                logger_1.default.error('Get profile error:', error);
                res.status(404).json((0, helpers_1.errorResponse)('User not found', error.message));
            }
        };
        this.updateProfile = async (req, res) => {
            try {
                const user = await this.userService.updateUser(req.user.id, req.body);
                res.json((0, helpers_1.successResponse)('Profile updated successfully', user));
            }
            catch (error) {
                logger_1.default.error('Update profile error:', error);
                res.status(400).json((0, helpers_1.errorResponse)('Profile update failed', error.message));
            }
        };
        this.getAllUsers = async (req, res) => {
            try {
                const { page, limit, skip } = (0, helpers_1.parsePageAndLimit)(req.query.page, req.query.limit);
                const { users, total } = await this.userService.getAllUsers(page, limit, skip);
                const pagination = (0, helpers_1.calculatePagination)(total, page, limit);
                res.json((0, helpers_1.successResponse)('Users retrieved successfully', users, pagination));
            }
            catch (error) {
                logger_1.default.error('Get all users error:', error);
                res.status(500).json((0, helpers_1.errorResponse)('Failed to retrieve users', error.message));
            }
        };
        this.getUserById = async (req, res) => {
            try {
                const user = await this.userService.getUserById(req.params.id);
                res.json((0, helpers_1.successResponse)('User retrieved successfully', user));
            }
            catch (error) {
                logger_1.default.error('Get user by ID error:', error);
                res.status(404).json((0, helpers_1.errorResponse)('User not found', error.message));
            }
        };
        this.updateUserRole = async (req, res) => {
            try {
                const { role } = req.body;
                const user = await this.userService.updateUserRole(req.params.id, role);
                res.json((0, helpers_1.successResponse)('User role updated successfully', user));
            }
            catch (error) {
                logger_1.default.error('Update user role error:', error);
                res.status(400).json((0, helpers_1.errorResponse)('Failed to update user role', error.message));
            }
        };
        this.deactivateUser = async (req, res) => {
            try {
                await this.userService.deactivateUser(req.params.id);
                res.json((0, helpers_1.successResponse)('User deactivated successfully'));
            }
            catch (error) {
                logger_1.default.error('Deactivate user error:', error);
                res.status(400).json((0, helpers_1.errorResponse)('Failed to deactivate user', error.message));
            }
        };
        this.getNotifications = async (req, res) => {
            try {
                const { page, limit, skip } = (0, helpers_1.parsePageAndLimit)(req.query.page, req.query.limit);
                const { notifications, total } = await this.userService.getUserNotifications(req.user.id, page, limit, skip);
                const pagination = (0, helpers_1.calculatePagination)(total, page, limit);
                res.json((0, helpers_1.successResponse)('Notifications retrieved successfully', notifications, pagination));
            }
            catch (error) {
                logger_1.default.error('Get notifications error:', error);
                res.status(500).json((0, helpers_1.errorResponse)('Failed to retrieve notifications', error.message));
            }
        };
        this.markNotificationAsRead = async (req, res) => {
            try {
                await this.userService.markNotificationAsRead(req.user.id, req.params.notificationId);
                res.json((0, helpers_1.successResponse)('Notification marked as read'));
            }
            catch (error) {
                logger_1.default.error('Mark notification as read error:', error);
                res.status(400).json((0, helpers_1.errorResponse)('Failed to mark notification as read', error.message));
            }
        };
        this.markAllNotificationsAsRead = async (req, res) => {
            try {
                await this.userService.markAllNotificationsAsRead(req.user.id);
                res.json((0, helpers_1.successResponse)('All notifications marked as read'));
            }
            catch (error) {
                logger_1.default.error('Mark all notifications as read error:', error);
                res.status(400).json((0, helpers_1.errorResponse)('Failed to mark notifications as read', error.message));
            }
        };
    }
}
exports.UserController = UserController;
//# sourceMappingURL=userController.js.map