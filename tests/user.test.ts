import request from 'supertest';
import { app } from '../src/app';
import prisma from '../src/config/database';
import redisClient from '../src/config/redis';

describe('User API', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'test' } }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/users/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Test123!@#',
        phone: '1234567890',
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.firstName).toBe(userData.firstName);
      expect(response.body.data.password).toBeUndefined();
    });

    it('should fail with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Test123!@#',
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with weak password', async () => {
      const userData = {
        email: 'test2@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: '123',
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
  describe('POST /api/v1/users/login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      const response = await request(app)
        .post('/api/v1/users/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.sessionId).toBeDefined();
      expect(response.body.data.expiresAt).toBeDefined();
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should fail with invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app)
        .post('/api/v1/users/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
    }); it('should fail with non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Test123!@#',
      };

      const response = await request(app)
        .post('/api/v1/users/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/users/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
        });

      authToken = loginResponse.body.data.token;
    });

    it('should fail logout without token', async () => {
      const response = await request(app)
        .post('/api/v1/users/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/users/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logout successful');
    });

    it('should not allow access with logged out token', async () => {
      // First logout
      await request(app)
        .post('/api/v1/users/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Then try to access protected route
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/users/logout-all', () => {
    let authTokens: string[] = [];

    beforeEach(async () => {
      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        const loginResponse = await request(app)
          .post('/api/v1/users/login')
          .send({
            email: 'test@example.com',
            password: 'Test123!@#',
          });

        authTokens.push(loginResponse.body.data.token);
      }

      // Ensure we have at least one valid token
      if (authTokens.length === 0) {
        throw new Error('Failed to get any valid auth tokens during test setup');
      }
    });

    afterEach(() => {
      authTokens = [];
    });

    it('should logout from all devices', async () => {
      const response = await request(app)
        .post('/api/v1/users/logout-all')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionsTerminated).toBeGreaterThan(0);
    });

    it('should invalidate all tokens after logout-all', async () => {
      // Logout from all devices
      await request(app)
        .post('/api/v1/users/logout-all')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .expect(200);

      // Try to access with any of the tokens
      for (const token of authTokens) {
        const response = await request(app)
          .get('/api/v1/users/profile')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('GET /api/v1/users/profile', () => {
    let authToken: string; beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
        });

      authToken = loginResponse.body.data.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('test@example.com');
    });

    it('should fail without token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
