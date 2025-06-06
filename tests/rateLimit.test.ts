import request from 'supertest';
import { app } from '../src/app';
import prisma from '../src/config/database';
import redisClient from '../src/config/redis';

describe('Rate Limiting', () => {
    let authToken: string;
    let userId: string;

    beforeAll(async () => {
        // Clean up test data
        await prisma.user.deleteMany({
            where: { email: { contains: 'ratetest' } }
        });

        // Create a test user
        const userData = {
            email: 'ratetest@example.com',
            firstName: 'Rate',
            lastName: 'Test',
            password: 'Test123!@#',
            phone: '1234567890',
        };

        const registerResponse = await request(app)
            .post('/api/v1/users/register')
            .send(userData);

        userId = registerResponse.body.data.id;

        // Login to get auth token
        const loginResponse = await request(app)
            .post('/api/v1/users/login')
            .send({
                email: userData.email,
                password: userData.password,
            });

        authToken = loginResponse.body.data.token;
    });

    afterAll(async () => {
        // Clean up
        await prisma.user.deleteMany({
            where: { email: { contains: 'ratetest' } }
        });
    });

    describe('Authentication Rate Limiting', () => {
        it('should allow normal login attempts', async () => {
            const loginData = {
                email: 'ratetest@example.com',
                password: 'Test123!@#',
            };

            const response = await request(app)
                .post('/api/v1/users/login')
                .send(loginData);

            expect(response.status).toBe(200);
            expect(response.headers['x-ratelimit-limit']).toBeDefined();
            expect(response.headers['x-ratelimit-remaining']).toBeDefined();
        });

        it('should include rate limit headers', async () => {
            const response = await request(app)
                .post('/api/v1/users/login')
                .send({
                    email: 'ratetest@example.com',
                    password: 'wrongpassword',
                });

            expect(response.headers['x-ratelimit-limit']).toBeDefined();
            expect(response.headers['x-ratelimit-remaining']).toBeDefined();
            expect(response.headers['x-ratelimit-reset']).toBeDefined();
        });
    });

    describe('Transaction Rate Limiting', () => {
        beforeEach(async () => {
            // Create an account for testing
            await request(app)
                .post('/api/v1/accounts')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    accountType: 'CHECKING',
                    initialBalance: 1000,
                });
        });

        it('should allow normal transaction creation', async () => {
            const transactionData = {
                amount: 50,
                type: 'DEPOSIT',
                description: 'Test deposit',
            };

            const response = await request(app)
                .post('/api/v1/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send(transactionData);

            expect(response.status).toBe(201);
            expect(response.headers['x-ratelimit-limit']).toBeDefined();
        });

        it('should track transaction rate limits per user', async () => {
            const transactionData = {
                amount: 10,
                type: 'DEPOSIT',
                description: 'Rate limit test',
            };

            // Make several requests to test rate limiting
            for (let i = 0; i < 3; i++) {
                const response = await request(app)
                    .post('/api/v1/transactions')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        ...transactionData,
                        description: `Rate limit test ${i}`,
                    });

                expect(response.status).toBe(201);

                const remaining = parseInt(response.headers['x-ratelimit-remaining'] as string);
                expect(remaining).toBeGreaterThanOrEqual(0);
            }
        });
    });

    describe('API Rate Limiting', () => {
        it('should apply general API rate limits', async () => {
            // Make multiple requests to test general API rate limiting
            const responses: any[] = [];

            for (let i = 0; i < 5; i++) {
                const response = await request(app)
                    .get('/api/v1/users/profile')
                    .set('Authorization', `Bearer ${authToken}`);

                responses.push(response);
            }

            // All requests should succeed under normal rate limits
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.headers['x-ratelimit-remaining']).toBeDefined();
            });
        });
    });

    describe('Rate Limit Headers', () => {
        it('should include proper rate limit headers in responses', async () => {
            const response = await request(app)
                .get('/api/v1/users/profile')
                .set('Authorization', `Bearer ${authToken}`);

            expect(response.headers['x-ratelimit-limit']).toBeDefined();
            expect(response.headers['x-ratelimit-remaining']).toBeDefined();
            expect(response.headers['x-ratelimit-reset']).toBeDefined();

            // Validate header values
            const limit = parseInt(response.headers['x-ratelimit-limit'] as string);
            const remaining = parseInt(response.headers['x-ratelimit-remaining'] as string);

            expect(limit).toBeGreaterThan(0);
            expect(remaining).toBeGreaterThanOrEqual(0);
            expect(remaining).toBeLessThanOrEqual(limit);
        });
    });

    describe('Bulk Operation Rate Limiting', () => {
        it('should apply stricter limits to bulk operations', async () => {
            const bulkData = {
                transactions: [
                    { amount: 100, type: 'DEPOSIT', description: 'Bulk test 1' },
                    { amount: 50, type: 'WITHDRAWAL', description: 'Bulk test 2' },
                ],
            };

            const response = await request(app)
                .post('/api/v1/bulk/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send(bulkData);

            // Should succeed but with stricter rate limits
            expect(response.status).toBe(201);
            expect(response.headers['x-ratelimit-limit']).toBeDefined();

            const limit = parseInt(response.headers['x-ratelimit-limit'] as string);
            // Bulk operations should have lower limits than regular transactions
            expect(limit).toBeLessThan(10); // Assuming regular transaction limit is 10/min
        });
    });
});
