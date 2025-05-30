"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const config_1 = __importDefault(require("./config/config"));
const middleware_1 = require("./middleware");
const routes_1 = __importDefault(require("./routes"));
const logger_1 = __importDefault(require("./utils/logger"));
const database_1 = __importDefault(require("./config/database"));
const app = (0, express_1.default)();
exports.app = app;
// Trust proxy for nginx
app.set('trust proxy', true);
const server = (0, http_1.createServer)(app);
exports.server = server;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: config_1.default.nodeEnv === 'production'
            ? ['https://yourdomain.com']
            : ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true,
    },
});
exports.io = io;
// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Fintech API',
            version: '1.0.0',
            description: 'A comprehensive fintech backend API with user management, accounts, and transactions',
            contact: {
                name: 'API Support',
                email: 'support@fintechapi.com',
            },
        },
        servers: [
            {
                url: config_1.default.nodeEnv === 'production' ? 'https://api.yourfintech.com' : `http://localhost:${config_1.default.port}`,
                description: config_1.default.nodeEnv === 'production' ? 'Production server' : 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Path to the API files
};
const swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
// Global middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(middleware_1.requestLogger);
app.use(middleware_1.securityMiddleware);
// Global rate limiting
app.use((0, middleware_1.createRateLimit)());
// API Documentation
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
// API routes
app.use('/api/v1', routes_1.default);
// Socket.IO for real-time notifications
io.on('connection', (socket) => {
    logger_1.default.info(`Client connected: ${socket.id}`);
    socket.on('join-user-room', (userId) => {
        socket.join(`user-${userId}`);
        logger_1.default.info(`User ${userId} joined their room`);
    });
    socket.on('disconnect', () => {
        logger_1.default.info(`Client disconnected: ${socket.id}`);
    });
});
// Make io accessible in other parts of the application
app.set('io', io);
// Error handling
app.use(middleware_1.notFound);
app.use(middleware_1.errorHandler);
// Graceful shutdown
const gracefulShutdown = async () => {
    logger_1.default.info('Starting graceful shutdown...');
    server.close(async () => {
        logger_1.default.info('HTTP server closed');
        try {
            await database_1.default.$disconnect();
            logger_1.default.info('Database connection closed');
            process.exit(0);
        }
        catch (error) {
            logger_1.default.error('Error during graceful shutdown:', error);
            process.exit(1);
        }
    });
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
exports.default = app;
//# sourceMappingURL=app.js.map