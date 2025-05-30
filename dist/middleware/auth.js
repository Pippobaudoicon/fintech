"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = exports.authorize = exports.authenticate = void 0;
const helpers_1 = require("../utils/helpers");
const database_1 = __importDefault(require("../config/database"));
const logger_1 = __importDefault(require("../utils/logger"));
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json((0, helpers_1.errorResponse)('Access token required'));
            return;
        }
        const token = authHeader.substring(7);
        const decoded = (0, helpers_1.verifyToken)(token);
        const user = await database_1.default.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
            },
        });
        if (!user || !user.isActive) {
            res.status(401).json((0, helpers_1.errorResponse)('Invalid or inactive user'));
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        logger_1.default.error('Authentication error:', error);
        res.status(401).json((0, helpers_1.errorResponse)('Invalid token'));
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json((0, helpers_1.errorResponse)('Authentication required'));
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json((0, helpers_1.errorResponse)('Insufficient permissions'));
            return;
        }
        next();
    };
};
exports.authorize = authorize;
const auditLog = (action, resource) => {
    return async (req, res, next) => {
        try {
            await database_1.default.auditLog.create({
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
        }
        catch (error) {
            logger_1.default.error('Audit log error:', error);
        }
        next();
    };
};
exports.auditLog = auditLog;
//# sourceMappingURL=auth.js.map