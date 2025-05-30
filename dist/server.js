"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const config_1 = __importDefault(require("./config/config"));
const logger_1 = __importDefault(require("./utils/logger"));
const database_1 = __importDefault(require("./config/database"));
const startServer = async () => {
    try {
        // Test database connection
        await database_1.default.$connect();
        logger_1.default.info('Database connection established successfully');
        // Start server
        app_1.server.listen(config_1.default.port, () => {
            logger_1.default.info(`🚀 Server running on port ${config_1.default.port} in ${config_1.default.nodeEnv} mode`);
            logger_1.default.info(`📚 API Documentation available at http://localhost:${config_1.default.port}/api-docs`);
            logger_1.default.info(`🔗 Health check available at http://localhost:${config_1.default.port}/api/v1/health`);
        });
    }
    catch (error) {
        logger_1.default.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=server.js.map