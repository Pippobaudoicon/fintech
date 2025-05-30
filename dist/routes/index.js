"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userRoutes_1 = __importDefault(require("./userRoutes"));
const accountRoutes_1 = __importDefault(require("./accountRoutes"));
const transactionRoutes_1 = __importDefault(require("./transactionRoutes"));
const router = (0, express_1.Router)();
// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Fintech API',
        version: '1.0.0',
    });
});
// API routes
router.use('/users', userRoutes_1.default);
router.use('/accounts', accountRoutes_1.default);
router.use('/transactions', transactionRoutes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map