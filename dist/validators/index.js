"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.idValidation = exports.dateRangeValidation = exports.paginationValidation = exports.paymentValidation = exports.transferValidation = exports.transactionValidation = exports.createAccountValidation = exports.loginValidation = exports.registerValidation = void 0;
const express_validator_1 = require("express-validator");
const client_1 = require("@prisma/client");
exports.registerValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('firstName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
    (0, express_validator_1.body)('lastName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must be at least 8 characters with uppercase, lowercase, number and special character'),
    (0, express_validator_1.body)('phone')
        .optional()
        .isMobilePhone('any')
        .withMessage('Please provide a valid phone number'),
    (0, express_validator_1.body)('dateOfBirth')
        .optional()
        .isISO8601()
        .withMessage('Please provide a valid date of birth'),
];
exports.loginValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required'),
];
exports.createAccountValidation = [
    (0, express_validator_1.body)('accountType')
        .isIn(Object.values(client_1.AccountType))
        .withMessage('Please provide a valid account type'),
    (0, express_validator_1.body)('currency')
        .optional()
        .isLength({ min: 3, max: 3 })
        .withMessage('Currency must be a 3-letter code'),
];
exports.transactionValidation = [
    (0, express_validator_1.body)('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),
    (0, express_validator_1.body)('type')
        .isIn(Object.values(client_1.TransactionType))
        .withMessage('Please provide a valid transaction type'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Description must not exceed 255 characters'),
    (0, express_validator_1.body)('currency')
        .optional()
        .isLength({ min: 3, max: 3 })
        .withMessage('Currency must be a 3-letter code'),
];
exports.transferValidation = [
    (0, express_validator_1.body)('fromAccountId')
        .notEmpty()
        .withMessage('Source account ID is required'),
    (0, express_validator_1.body)('toAccountId')
        .notEmpty()
        .withMessage('Destination account ID is required'),
    (0, express_validator_1.body)('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Description must not exceed 255 characters'),
];
exports.paymentValidation = [
    (0, express_validator_1.body)('accountId')
        .notEmpty()
        .withMessage('Account ID is required'),
    (0, express_validator_1.body)('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be greater than 0'),
    (0, express_validator_1.body)('description')
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Description is required and must not exceed 255 characters'),
    (0, express_validator_1.body)('recipientDetails.name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Recipient name must be between 2 and 100 characters'),
    (0, express_validator_1.body)('recipientDetails.email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid recipient email'),
];
exports.paginationValidation = [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
];
exports.dateRangeValidation = [
    (0, express_validator_1.query)('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO date'),
    (0, express_validator_1.query)('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO date'),
];
exports.idValidation = [
    (0, express_validator_1.param)('id')
        .notEmpty()
        .withMessage('ID parameter is required'),
];
//# sourceMappingURL=index.js.map