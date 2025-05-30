"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = exports.securityMiddleware = exports.notFound = exports.errorHandler = exports.validate = exports.createRateLimit = void 0;
const express_validator_1 = require("express-validator");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const config_1 = __importDefault(require("../config/config"));
const logger_1 = __importDefault(require("../utils/logger"));
const helpers_1 = require("../utils/helpers");
// Rate limiting middleware
const createRateLimit = (windowMs, max) => {
    return (0, express_rate_limit_1.default)({
        windowMs: windowMs || config_1.default.rateLimit.windowMs,
        max: max || config_1.default.rateLimit.maxRequests,
        message: (0, helpers_1.errorResponse)('Too many requests, please try again later'),
        standardHeaders: true,
        legacyHeaders: false,
    });
};
exports.createRateLimit = createRateLimit;
// Validation middleware
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        res.status(400).json((0, helpers_1.errorResponse)('Validation failed', errors.array().map(err => err.msg).join(', ')));
        return;
    }
    next();
};
exports.validate = validate;
// Error handling middleware
const errorHandler = (error, req, res, next) => {
    logger_1.default.error('Error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
    });
    if (error.code === 'P2002') {
        res.status(409).json((0, helpers_1.errorResponse)('Resource already exists'));
        return;
    }
    if (error.code === 'P2025') {
        res.status(404).json((0, helpers_1.errorResponse)('Resource not found'));
        return;
    }
    const statusCode = error.statusCode || 500;
    const message = config_1.default.nodeEnv === 'production'
        ? 'Internal server error'
        : error.message;
    res.status(statusCode).json((0, helpers_1.errorResponse)(message));
};
exports.errorHandler = errorHandler;
// Not found middleware
const notFound = (req, res) => {
    res.status(404).json((0, helpers_1.errorResponse)(`Route ${req.originalUrl} not found`));
};
exports.notFound = notFound;
// Security middleware
exports.securityMiddleware = [
    (0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
            },
        },
    }),
    (0, cors_1.default)({
        origin: config_1.default.nodeEnv === 'production'
            ? ['https://yourdomain.com']
            : ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true,
    }),
];
// Logging middleware
exports.requestLogger = (0, morgan_1.default)('combined', {
    stream: {
        write: (message) => {
            logger_1.default.info(message.trim());
        },
    },
});
//# sourceMappingURL=index.js.map