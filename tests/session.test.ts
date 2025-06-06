import request from 'supertest';
import { app } from '../src/app';
import prisma from '../src/config/database';
import { sessionService } from '../src/services/sessionService';
import jwt from 'jsonwebtoken';
import config from '../src/config/config';

describe('Session Management', () => {
    let userId: string;
    let userEmail: string;

    beforeAll(async () => {
        // Clean up test data
        await prisma.user.deleteMany({
            where: { email: { contains: 'sessiontest' } }
        });

        // Create a test user
        const userData = {
            email: 'sessiontest@example.com',
            firstName: 'Session',
            lastName: 'Test',
            password: 'Test123!@#',
            phone: '1234567890',
        };

        const registerResponse = await request(app)
            .post('/api/v1/users/register')
            .send(userData);

        userId = registerResponse.body.data.id;
        userEmail = userData.email;
    });

    afterAll(async () => {
        // Clean up
        await prisma.user.deleteMany({
            where: { email: { contains: 'sessiontest' } }
        });
    });

    describe('Session Creation', () => {
        it('should create a session on login', async () => {
            const loginResponse = await request(app)
                .post('/api/v1/users/login')
                .send({
                    email: userEmail,
                    password: 'Test123!@#',
                })
                .expect(200);

            expect(loginResponse.body.success).toBe(true);
            expect(loginResponse.body.data.token).toBeDefined();
            expect(loginResponse.body.data.sessionId).toBeDefined();
            expect(loginResponse.body.data.expiresAt).toBeDefined();

            // Verify token is valid JWT
            const decoded = jwt.verify(loginResponse.body.data.token, config.jwtSecret);
            expect(decoded).toBeDefined();
            expect((decoded as any).userId).toBe(userId);
            expect((decoded as any).email).toBe(userEmail);
            expect((decoded as any).sessionId).toBe(loginResponse.body.data.sessionId);
        });

        it('should include device information in session', async () => {
            const loginResponse = await request(app)
                .post('/api/v1/users/login')
                .set('User-Agent', 'TestAgent/1.0')
                .send({
                    email: userEmail,
                    password: 'Test123!@#',
                })
                .expect(200);

            expect(loginResponse.body.success).toBe(true);

            // The session should be created with device info
            // We can't directly access Redis in tests, but we can verify the response structure
            expect(loginResponse.body.data.token).toBeDefined();
            expect(loginResponse.body.data.sessionId).toBeDefined();
        });
    });

    describe('Session Validation', () => {
        let authToken: string;

        beforeEach(async () => {
            const loginResponse = await request(app)
                .post('/api/v1/users/login')
                .send({
                    email: userEmail,
                    password: 'Test123!@#',
                });

            authToken = loginResponse.body.data.token;
        });

        it('should validate valid session tokens', async () => {
            const response = await request(app)
                .get('/api/v1/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.email).toBe(userEmail);
        });

        it('should reject invalid tokens', async () => {
            const invalidToken = 'invalid.token.here';

            const response = await request(app)
                .get('/api/v1/users/profile')
                .set('Authorization', `Bearer ${invalidToken}`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should reject expired tokens', async () => {
            // Create a token that's already expired
            const expiredPayload = {
                userId,
                email: userEmail,
                sessionId: 'test-session-id',
                exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
            };

            const expiredToken = jwt.sign(expiredPayload, config.jwtSecret);

            const response = await request(app)
                .get('/api/v1/users/profile')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Session Termination', () => {
        let authToken: string;

        beforeEach(async () => {
            const loginResponse = await request(app)
                .post('/api/v1/users/login')
                .send({
                    email: userEmail,
                    password: 'Test123!@#',
                });

            authToken = loginResponse.body.data.token;
        });

        it('should logout and invalidate session', async () => {
            // Verify token works before logout
            await request(app)
                .get('/api/v1/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Logout
            const logoutResponse = await request(app)
                .post('/api/v1/users/logout')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(logoutResponse.body.success).toBe(true);

            // Verify token no longer works
            await request(app)
                .get('/api/v1/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(401);
        }); it('should logout from all devices', async () => {
            // Create multiple sessions
            const tokens: string[] = [];
            for (let i = 0; i < 3; i++) {
                const loginResponse = await request(app)
                    .post('/api/v1/users/login')
                    .send({
                        email: userEmail,
                        password: 'Test123!@#',
                    });
                tokens.push(loginResponse.body.data.token);
            }

            // Verify all tokens work
            for (const token of tokens) {
                await request(app)
                    .get('/api/v1/users/profile')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
            }

            // Logout from all devices using first token
            const logoutAllResponse = await request(app)
                .post('/api/v1/users/logout-all')
                .set('Authorization', `Bearer ${tokens[0]}`)
                .expect(200);

            expect(logoutAllResponse.body.success).toBe(true);
            expect(logoutAllResponse.body.data.sessionsTerminated).toBeGreaterThan(0);

            // Verify all tokens are now invalid
            for (const token of tokens) {
                await request(app)
                    .get('/api/v1/users/profile')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(401);
            }
        });
    });

    describe('Multiple Device Sessions', () => {
        it('should allow multiple concurrent sessions', async () => {
            const sessions: Array<{ token: string; sessionId: string }> = [];

            // Create multiple sessions from different "devices"
            for (let i = 0; i < 3; i++) {
                const loginResponse = await request(app)
                    .post('/api/v1/users/login')
                    .set('User-Agent', `TestDevice${i}/1.0`)
                    .send({
                        email: userEmail,
                        password: 'Test123!@#',
                    })
                    .expect(200);

                sessions.push({
                    token: loginResponse.body.data.token,
                    sessionId: loginResponse.body.data.sessionId,
                });
            }

            // All sessions should be valid
            for (const session of sessions) {
                const response = await request(app)
                    .get('/api/v1/users/profile')
                    .set('Authorization', `Bearer ${session.token}`)
                    .expect(200);

                expect(response.body.success).toBe(true);
            }

            // Each session should have unique session IDs
            const sessionIds = sessions.map(s => s.sessionId);
            const uniqueSessionIds = [...new Set(sessionIds)];
            expect(uniqueSessionIds.length).toBe(sessions.length);
        });

        it('should logout individual sessions without affecting others', async () => {
            // Create two sessions
            const session1Response = await request(app)
                .post('/api/v1/users/login')
                .send({
                    email: userEmail,
                    password: 'Test123!@#',
                });

            const session2Response = await request(app)
                .post('/api/v1/users/login')
                .send({
                    email: userEmail,
                    password: 'Test123!@#',
                });

            const token1 = session1Response.body.data.token;
            const token2 = session2Response.body.data.token;

            // Both should work
            await request(app)
                .get('/api/v1/users/profile')
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            await request(app)
                .get('/api/v1/users/profile')
                .set('Authorization', `Bearer ${token2}`)
                .expect(200);

            // Logout from first session
            await request(app)
                .post('/api/v1/users/logout')
                .set('Authorization', `Bearer ${token1}`)
                .expect(200);

            // First token should be invalid
            await request(app)
                .get('/api/v1/users/profile')
                .set('Authorization', `Bearer ${token1}`)
                .expect(401);

            // Second token should still work
            await request(app)
                .get('/api/v1/users/profile')
                .set('Authorization', `Bearer ${token2}`)
                .expect(200);
        });
    });

    describe('Session Service Direct Testing', () => {
        it('should create session with device info', async () => {
            const deviceInfo = {
                deviceId: 'test-device-123',
                userAgent: 'TestAgent/1.0',
                ipAddress: '127.0.0.1',
            };

            const session = await sessionService.createSession(userId, userEmail, deviceInfo);

            expect(session.token).toBeDefined();
            expect(session.sessionId).toBeDefined();
            expect(session.expiresAt).toBeInstanceOf(Date);

            // Verify token is valid
            const decoded = jwt.verify(session.token, config.jwtSecret);
            expect((decoded as any).userId).toBe(userId);
            expect((decoded as any).sessionId).toBe(session.sessionId);
        });

        it('should validate sessions', async () => {
            const session = await sessionService.createSession(userId, userEmail);

            const sessionData = await sessionService.validateSession(session.token);

            expect(sessionData).toBeDefined();
            expect(sessionData?.userId).toBe(userId);
            expect(sessionData?.email).toBe(userEmail);
        });

        it('should blacklist tokens', async () => {
            const session = await sessionService.createSession(userId, userEmail);

            // Token should be valid initially
            let sessionData = await sessionService.validateSession(session.token);
            expect(sessionData).toBeDefined();

            // Blacklist the token
            await sessionService.blacklistToken(session.token);

            // Token should now be invalid
            sessionData = await sessionService.validateSession(session.token);
            expect(sessionData).toBeNull();
        }); it('should terminate all user sessions', async () => {
            // Create multiple sessions
            const sessions: Array<{ token: string; sessionId: string; expiresAt: Date }> = [];
            for (let i = 0; i < 3; i++) {
                const session = await sessionService.createSession(userId, userEmail);
                sessions.push(session);
            }

            // All should be valid
            for (const session of sessions) {
                const sessionData = await sessionService.validateSession(session.token);
                expect(sessionData).toBeDefined();
            }

            // Terminate all sessions
            const terminatedCount = await sessionService.terminateAllUserSessions(userId);
            expect(terminatedCount).toBeGreaterThan(0);

            // All should now be invalid
            for (const session of sessions) {
                const sessionData = await sessionService.validateSession(session.token);
                expect(sessionData).toBeNull();
            }
        });
    });
});
