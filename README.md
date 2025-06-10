# Fintech Backend API

A comprehensive fintech backend application built with Node.js, TypeScript, Express, and PostgreSQL. This project demonstrates modern backend development practices for financial services, including secure authentication, transaction processing, real-time notifications, and comprehensive API documentation.

## 🚀 Features

- **User Authentication & Authorization**: JWT-based auth with role-based access control (CUSTOMER, ADMIN, SUPPORT)
- **Account Management**: Multi-account support with different account types (CHECKING, SAVINGS, BUSINESS)
- **Transaction Processing**: Secure money transfers, deposits, withdrawals with atomic operations
- **Real-time Notifications**: WebSocket-based notifications for transaction updates
- **API Rate Limiting**: Configurable rate limits for financial operations
- **Comprehensive Logging**: Structured logging with Winston for audit trails
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Security Features**: Input validation, SQL injection protection, CORS, helmet
- **Database Migrations**: Prisma ORM with type-safe database operations
- **Testing Suite**: Jest-based unit and integration tests
- **Docker Support**: Production-ready containerization

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JSON Web Tokens (JWT)
- **Real-time**: Socket.IO
- **Testing**: Jest, Supertest
- **Documentation**: Swagger/OpenAPI
- **Logging**: Winston
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

- Node.js 18 or higher
- PostgreSQL 13 or higher
- Redis (for rate limiting)
- Docker & Docker Compose (optional)

## 🚀 Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd fintech
npm install
```

### 2. Environment Setup

Copy the environment example file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://fintech_user:fintech_pass@localhost:5432/fintech_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="development"

# Redis (for rate limiting)
REDIS_URL="redis://localhost:6379"

# Logging
LOG_LEVEL="info"
```

### 3. Database Setup

#### Option A: Using Docker (Recommended)

Start the database and Redis services:

```bash
npm run docker:up
```

#### Option B: Local PostgreSQL

1. Create a PostgreSQL database named `fintech_db`
2. Update the `DATABASE_URL` in your `.env` file
3. Run migrations:

```bash
npm run db:migrate
```

### 4. Generate Prisma Client

```bash
npm run db:generate
```

### 5. Start the Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm run build
npm start
```

The API will be available at `http://localhost:3000`

## 📚 API Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI JSON**: `http://localhost:3000/api-docs.json`

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

### Rate Limiting Tests

The project includes comprehensive rate limiting tests:

- **Unit Tests**: Mock-based tests for rate limiting logic
- **Integration Tests**: Real Redis integration tests
- **Manual Testing**: End-to-end rate limiting verification

```bash
# Test rate limiting manually (requires server to be running)
node scripts/test-rate-limiting.js
```

The manual test script will:
- Test global API rate limiting
- Test authentication rate limiting (login/register)
- Test financial operation rate limiting (transactions, transfers, payments)
- Display rate limit headers and responses

## 🐳 Docker Deployment

### Development with Docker Compose

```bash
# Start all services (app, database, redis)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment

```bash
# Build production image
docker build -t fintech-api .

# Run with environment variables
docker run -p 3000:3000 --env-file .env fintech-api
```

## 📁 Project Structure

```
fintech/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── validators/      # Input validation schemas
│   ├── app.ts           # Express app configuration
│   └── server.ts        # Server entry point
├── prisma/
│   └── schema.prisma    # Database schema
├── tests/               # Test files
├── logs/                # Application logs
├── docker-compose.yml   # Docker services
├── Dockerfile           # Container configuration
└── README.md
```

## 🔑 Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles

- **CUSTOMER**: Standard user with access to personal accounts and transactions
- **ADMIN**: Full system access including user management
- **SUPPORT**: Read access for customer support operations

## 💰 Core API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users` - List users (Admin only)

### Accounts
- `GET /api/accounts` - Get user accounts
- `POST /api/accounts` - Create new account
- `GET /api/accounts/:id` - Get account details
- `GET /api/accounts/:id/transactions` - Get account transactions

### Transactions
- `POST /api/transactions/transfer` - Transfer money between accounts
- `POST /api/transactions/deposit` - Deposit money
- `POST /api/transactions/withdraw` - Withdraw money
- `GET /api/transactions` - Get transaction history

## 🔒 Security Features

- **Input Validation**: Comprehensive validation using Joi schemas
- **SQL Injection Protection**: Prisma ORM with prepared statements
- **Rate Limiting**: Redis-based rate limiting with different limits for different operations
  - Authentication: 5 attempts per 15 minutes per email/IP
  - Financial Operations: 3-10 requests per minute per user based on operation type
  - Global API: 100 requests per minute per IP
- **CORS Protection**: Cross-origin request security
- **Helmet**: Security headers middleware
- **Audit Logging**: All financial operations are logged
- **Password Hashing**: bcrypt for secure password storage

### Rate Limiting Details

The API implements sophisticated Redis-based rate limiting:

- **Progressive Limits**: Stricter limits for sensitive operations (payments < transfers < transactions)
- **Multiple Strategies**: Email-based for auth, user-based for financial ops, IP-based for general API
- **Graceful Degradation**: Fails open if Redis is unavailable
- **Rate Limit Headers**: All responses include limit status headers
- **Admin Controls**: Rate limits can be reset for troubleshooting

For detailed rate limiting documentation, see [RATE_LIMITING.md](./RATE_LIMITING.md)

## 🏗 Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:studio` - Open Prisma Studio
- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services

### Code Style

The project uses TypeScript strict mode and follows these conventions:
- ESLint for code linting
- Prettier for code formatting
- Husky for pre-commit hooks (optional)

## 📊 Monitoring & Logging

- **Structured Logging**: Winston with JSON format
- **Log Levels**: error, warn, info, debug
- **Log Files**: Stored in `logs/` directory
- **Audit Trail**: All financial operations are logged with user context

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the API documentation at `/api-docs`
- Review the test files for usage examples
- Create an issue in the repository

## 🎯 Next Steps

- Implement payment gateway integration (Stripe, PayPal)
- Add financial analytics and reporting
- Implement KYC (Know Your Customer) verification
- Add support for multiple currencies
- Implement automated compliance checks
- Add GraphQL API alongside REST
- Implement event sourcing for audit compliance
