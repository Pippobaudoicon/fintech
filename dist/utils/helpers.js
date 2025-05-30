"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeUser = exports.validateEmail = exports.calculatePagination = exports.parsePageAndLimit = exports.errorResponse = exports.successResponse = exports.formatCurrency = exports.generateTransactionReference = exports.generateAccountNumber = exports.verifyToken = exports.generateToken = exports.comparePassword = exports.hashPassword = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config/config"));
const hashPassword = async (password) => {
    return bcryptjs_1.default.hash(password, config_1.default.bcryptRounds);
};
exports.hashPassword = hashPassword;
const comparePassword = async (password, hash) => {
    return bcryptjs_1.default.compare(password, hash);
};
exports.comparePassword = comparePassword;
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, config_1.default.jwtSecret, {
        expiresIn: config_1.default.jwtExpiresIn
    });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, config_1.default.jwtSecret);
};
exports.verifyToken = verifyToken;
const generateAccountNumber = () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `FT${timestamp.slice(-6)}${random}`;
};
exports.generateAccountNumber = generateAccountNumber;
const generateTransactionReference = () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `TXN${timestamp}${random}`;
};
exports.generateTransactionReference = generateTransactionReference;
const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(amount);
};
exports.formatCurrency = formatCurrency;
const successResponse = (message, data, meta) => ({
    success: true,
    message,
    data,
    meta,
});
exports.successResponse = successResponse;
const errorResponse = (message, error) => ({
    success: false,
    message,
    error,
});
exports.errorResponse = errorResponse;
const parsePageAndLimit = (page, limit) => {
    const parsedPage = parseInt(page || '1', 10);
    const parsedLimit = parseInt(limit || '10', 10);
    return {
        page: Math.max(1, parsedPage),
        limit: Math.min(100, Math.max(1, parsedLimit)),
        skip: (Math.max(1, parsedPage) - 1) * Math.min(100, Math.max(1, parsedLimit)),
    };
};
exports.parsePageAndLimit = parsePageAndLimit;
const calculatePagination = (total, page, limit) => ({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1,
});
exports.calculatePagination = calculatePagination;
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const sanitizeUser = (user) => {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
};
exports.sanitizeUser = sanitizeUser;
//# sourceMappingURL=helpers.js.map