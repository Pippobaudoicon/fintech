import request from 'supertest';
import { app } from '../src/app';
import prisma from '../src/config/database';

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

  describe('Session Management', () => {
    let authToken: string;
    let sessionId: string;
    let secondToken: string;
    let secondSessionId: string;

    beforeAll(async () => {
      // Login to get a session
      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'test@example.com', password: 'Test123!@#' });
      authToken = loginResponse.body.data.token;
      sessionId = loginResponse.body.data.sessionId;

      // Login again to create a second session (multi-device)
      const loginResponse2 = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'test@example.com', password: 'Test123!@#' });
      secondToken = loginResponse2.body.data.token;
      secondSessionId = loginResponse2.body.data.sessionId;
    });

    it('should list all active sessions', async () => {
      const response = await request(app)
        .get('/api/v1/users/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data.some((s: any) => s.id === sessionId)).toBe(true);
      expect(response.body.data.some((s: any) => s.id === secondSessionId)).toBe(true);
    });

    it('should revoke (logout) a specific session', async () => {
      // Revoke the second session from the first session
      const response = await request(app)
        .delete(`/api/v1/users/sessions/${secondSessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(response.body.success).toBe(true);

      // That session should no longer be valid
      const fail = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${secondToken}`)
        .expect(401);
      expect(fail.body.success).toBe(false);
    });

    it('should revoke all other sessions except the current one', async () => {
      // Login again to create another session
      const loginResponse3 = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'test@example.com', password: 'Test123!@#' });
      const thirdToken = loginResponse3.body.data.token;
      const thirdSessionId = loginResponse3.body.data.sessionId;

      // Revoke all other sessions from the third session
      const response = await request(app)
        .post('/api/v1/users/sessions/revoke-others')
        .set('Authorization', `Bearer ${thirdToken}`)
        .expect(200);
      expect(response.body.success).toBe(true);

      // The original session should now be invalid
      const fail = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);
      expect(fail.body.success).toBe(false);

      // The third session should still be valid
      const ok = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${thirdToken}`)
        .expect(200);
      expect(ok.body.success).toBe(true);
    });
  });
});
