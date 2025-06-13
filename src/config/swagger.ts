import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import config from './config';

// Swagger configuration options
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Fintech API',
      version: '1.0.0',
      description: `
        A comprehensive fintech backend API built with Node.js, TypeScript, Express, and PostgreSQL.
        
        ## Features
        - **User Authentication & Authorization**: JWT-based auth with role-based access control
        - **Account Management**: Multi-account support with different account types
        - **Transaction Processing**: Secure money transfers, deposits, withdrawals with atomic operations
        - **Real-time Notifications**: WebSocket-based notifications for transaction updates
        - **API Rate Limiting**: Configurable rate limits for financial operations
        - **Comprehensive Logging**: Structured logging with Winston for audit trails
        - **Security Features**: Input validation, SQL injection protection, CORS, helmet
        
        ## Authentication
        Most endpoints require authentication via Bearer token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`
        
        ## User Roles
        - **CUSTOMER**: Standard user with access to personal accounts and transactions
        - **ADMIN**: Full system access including user management
        - **SUPPORT**: Read access for customer support operations
        
        ## Rate Limiting
        API requests are rate-limited to ensure system stability and security. Financial operations have stricter limits.
        
        ## Error Handling
        All API responses follow a consistent format:
        - Success responses include \`success: true\`, \`message\`, and \`data\`
        - Error responses include \`success: false\`, \`message\`, and optional \`error\` details
        - Pagination is included for list endpoints with \`pagination\` object
      `,
      termsOfService: 'https://fintechapi.com/terms',
      contact: {
        name: 'API Support',
        email: 'support@fintechapi.com',
        url: 'https://fintechapi.com/support',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url:
          config.nodeEnv === 'production'
            ? 'https://api.yourfintech.com'
            : `http://localhost:${config.port}`,
        description: config.nodeEnv === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication information is missing or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false,
                  },
                  message: {
                    type: 'string',
                    example: 'Access token required',
                  },
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false,
                  },
                  message: {
                    type: 'string',
                    example: 'Insufficient permissions',
                  },
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false,
                  },
                  message: {
                    type: 'string',
                    example: 'Validation failed',
                  },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: {
                          type: 'string',
                        },
                        message: {
                          type: 'string',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        RateLimitError: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false,
                  },
                  message: {
                    type: 'string',
                    example: 'Too many requests, please try again later',
                  },
                },
              },
            },
          },
        },
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number (starts from 1)',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page (1-100)',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10,
          },
        },
        CuidParam: {
          name: 'id',
          in: 'path',
          required: true,
          description: 'CUID identifier',
          schema: {
            type: 'string',
            format: 'cuid',
          },
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

// Generate Swagger specification
export const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI options
export const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Fintech API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
  },
};

export { swaggerUi };
