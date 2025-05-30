# Copilot Instructions for Fintech Backend API

## Project Overview
This is a comprehensive fintech backend API built with TypeScript, Node.js, Express, and PostgreSQL. The project demonstrates modern backend development practices for financial services.

## Tech Stack
- **Backend**: Node.js 18+, TypeScript, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with role-based access control
- **Real-time**: Socket.IO for notifications
- **Testing**: Jest with Supertest
- **Documentation**: Swagger/OpenAPI
- **Deployment**: Docker & Docker Compose

## Code Style & Conventions

### TypeScript
- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use enum for constants with multiple values
- Always type function parameters and return types
- Use generic types where appropriate

### File Organization
- Controllers: Handle HTTP requests/responses, minimal business logic
- Services: Contain business logic, interact with database
- Middleware: Authentication, validation, error handling
- Routes: Define API endpoints and apply middleware
- Types: Shared TypeScript interfaces and types
- Utils: Helper functions and utilities

### Naming Conventions
- Files: camelCase (e.g., `userService.ts`)
- Classes: PascalCase (e.g., `UserService`)
- Functions/Variables: camelCase (e.g., `getUserById`)
- Constants: UPPER_SNAKE_CASE (e.g., `JWT_SECRET`)
- Database fields: snake_case (e.g., `created_at`)

### Error Handling
- Use custom error classes that extend Error
- Always wrap async operations in try-catch blocks
- Use proper HTTP status codes
- Log errors with context information
- Never expose sensitive information in error messages

### Security Best Practices
- Always validate input using Joi schemas
- Use parameterized queries (Prisma handles this)
- Implement rate limiting for sensitive endpoints
- Log all financial operations for audit trails
- Use bcrypt for password hashing
- Implement proper JWT token validation

### Database Practices
- Use Prisma transactions for multi-table operations
- Always handle unique constraint violations
- Use proper indexing for performance
- Implement soft deletes where appropriate
- Use UUID for sensitive IDs

### Testing Guidelines
- Write unit tests for services and utilities
- Write integration tests for API endpoints
- Mock external dependencies
- Test error scenarios and edge cases
- Maintain >80% code coverage

## API Design Principles

### REST Conventions
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Use plural nouns for resource endpoints
- Use nested routes for related resources
- Return consistent response formats
- Use proper status codes

### Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "uuid"
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": []
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "uuid"
  }
}
```

## Financial Domain Rules

### Account Management
- Users can have multiple accounts
- Account types: CHECKING, SAVINGS, BUSINESS
- Each account has a unique account number
- Balance cannot go negative for SAVINGS accounts
- Minimum balance requirements may apply

### Transaction Processing
- All monetary operations must be atomic
- Use database transactions for transfers
- Implement proper decimal handling for money
- Log all financial operations
- Validate sufficient funds before transfers

### Security & Compliance
- Implement audit logging for all financial operations
- Rate limit financial operations (transfers, withdrawals)
- Validate user permissions for account access
- Log failed authentication attempts
- Implement session management

## Common Patterns

### Service Layer Pattern
```typescript
export class UserService {
  static async getUserById(id: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({ where: { id } });
    } catch (error) {
      logger.error('Error fetching user', { userId: id, error });
      throw new DatabaseError('Failed to fetch user');
    }
  }
}
```

### Controller Pattern
```typescript
export const getUserProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await UserService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json(createErrorResponse('User not found'));
    }
    res.json(createSuccessResponse(user));
  } catch (error) {
    next(error);
  }
};
```

### Validation Pattern
```typescript
export const transferSchema = Joi.object({
  fromAccountId: Joi.string().uuid().required(),
  toAccountId: Joi.string().uuid().required(),
  amount: Joi.number().positive().precision(2).required(),
  description: Joi.string().max(255).optional()
});
```

## Development Workflow

1. **Feature Development**:
   - Create feature branch from main
   - Write tests first (TDD approach)
   - Implement feature with proper error handling
   - Update API documentation if needed
   - Run tests and ensure coverage

2. **Database Changes**:
   - Update Prisma schema
   - Generate migration: `npm run db:migrate`
   - Update TypeScript types if needed
   - Test migration on development data

3. **API Changes**:
   - Update validation schemas
   - Update controllers and services
   - Update Swagger documentation
   - Write/update tests
   - Test with Postman/REST client

## Performance Considerations

- Use database indexes for frequently queried fields
- Implement pagination for list endpoints
- Use connection pooling (handled by Prisma)
- Cache frequently accessed data where appropriate
- Monitor query performance and optimize N+1 queries

## Monitoring & Logging

- Log all financial operations with user context
- Use structured logging (JSON format)
- Include correlation IDs for request tracing
- Monitor error rates and response times
- Set up alerts for critical failures

When working on this project, always consider security, performance, and maintainability. Follow the established patterns and conventions to ensure consistency across the codebase.
