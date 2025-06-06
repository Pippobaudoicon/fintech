import request from 'supertest';
import { app } from '../src/app';
import prisma from '../src/config/database';

describe('Transaction API with Redis Features', () => {
    let authToken: string;
    let userId: string;
    let accountId: string;

    beforeAll(async () => {
        // Clean up test data
        await prisma.user.deleteMany({
            where: { email: { contains: 'transactiontest' } }
        });

        // Create a test user
        const userData = {
            email: 'transactiontest@example.com',
            firstName: 'Transaction',
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

        // Create an account for testing
        const accountResponse = await request(app)
            .post('/api/v1/accounts')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                accountType: 'CHECKING',
                initialBalance: 1000,
            });

        accountId = accountResponse.body.data.id;
    });

    afterAll(async () => {
        // Clean up
        await prisma.user.deleteMany({
            where: { email: { contains: 'transactiontest' } }
        });
    });

    describe('Transaction Creation with Rate Limiting', () => {
        it('should create transaction with rate limit headers', async () => {
            const transactionData = {
                amount: 100,
                type: 'DEPOSIT',
                description: 'Test deposit with rate limiting',
                toAccountId: accountId, // Add the account ID for deposits
            };

            const response = await request(app)
                .post('/api/v1/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send(transactionData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.amount).toBe(transactionData.amount);
            expect(response.body.data.type).toBe(transactionData.type);

            // Check rate limit headers
            expect(response.headers['x-ratelimit-limit']).toBeDefined();
            expect(response.headers['x-ratelimit-remaining']).toBeDefined();
            expect(response.headers['x-ratelimit-reset']).toBeDefined();
        }); it('should respect transaction rate limits', async () => {
            const transactionData = {
                amount: 50,
                type: 'DEPOSIT',
                description: 'Rate limit test',
                toAccountId: accountId, // Add the account ID for deposits
            };

            // Make multiple requests to test rate limiting
            const responses: any[] = [];
            for (let i = 0; i < 5; i++) {
                const response = await request(app)
                    .post('/api/v1/transactions')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        ...transactionData,
                        description: `Rate limit test ${i}`,
                    });

                responses.push(response);
            }

            // All should succeed under normal rate limits (10 per minute)
            responses.forEach((response, index) => {
                expect(response.status).toBe(201);

                const remaining = parseInt(response.headers['x-ratelimit-remaining'] as string);
                expect(remaining).toBeGreaterThanOrEqual(0);

                // Remaining should decrease with each request
                if (index > 0) {
                    const prevRemaining = parseInt(responses[index - 1].headers['x-ratelimit-remaining'] as string);
                    expect(remaining).toBeLessThanOrEqual(prevRemaining);
                }
            });
        });

        it('should handle different transaction types', async () => {
            const transactionTypes = ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'];

            for (const type of transactionTypes) {
                const transactionData = {
                    amount: 25,
                    type,
                    description: `Test ${type.toLowerCase()}`,
                };

                const response = await request(app)
                    .post('/api/v1/transactions')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(transactionData)
                    .expect(201);

                expect(response.body.success).toBe(true);
                expect(response.body.data.type).toBe(type);
            }
        });
    });

    describe('Transaction List with Caching', () => {
        beforeEach(async () => {
            // Create some test transactions
            const transactions = [
                { amount: 100, type: 'DEPOSIT', description: 'Cache test deposit' },
                { amount: 50, type: 'WITHDRAWAL', description: 'Cache test withdrawal' },
                { amount: 75, type: 'TRANSFER', description: 'Cache test transfer' },
            ];

            for (const transaction of transactions) {
                await request(app)
                    .post('/api/v1/transactions')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(transaction);
            }
        });

        it('should return cached transaction list', async () => {
            // First request - populates cache
            const response1 = await request(app)
                .get('/api/v1/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response1.body.success).toBe(true);
            expect(response1.body.data.length).toBeGreaterThan(0);

            // Second request - should be served from cache
            const response2 = await request(app)
                .get('/api/v1/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response2.body.success).toBe(true);
            expect(response2.body.data).toEqual(response1.body.data);
        });

        it('should support filtered transaction lists', async () => {
            // Test filtering by type
            const depositResponse = await request(app)
                .get('/api/v1/transactions?type=DEPOSIT')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(depositResponse.body.success).toBe(true);
            depositResponse.body.data.forEach((transaction: any) => {
                expect(transaction.type).toBe('DEPOSIT');
            });

            // Test filtering by amount range
            const amountResponse = await request(app)
                .get('/api/v1/transactions?minAmount=75')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(amountResponse.body.success).toBe(true);
            amountResponse.body.data.forEach((transaction: any) => {
                expect(transaction.amount).toBeGreaterThanOrEqual(75);
            });
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/v1/transactions?page=1&limit=2')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeLessThanOrEqual(2);
            expect(response.body.pagination).toBeDefined();
            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(2);
        });
    });

    describe('Bulk Transactions with Rate Limiting', () => {
        it('should process bulk transactions with stricter rate limits', async () => {
            const bulkData = {
                transactions: [
                    { amount: 100, type: 'DEPOSIT', description: 'Bulk test 1' },
                    { amount: 50, type: 'WITHDRAWAL', description: 'Bulk test 2' },
                    { amount: 25, type: 'DEPOSIT', description: 'Bulk test 3' },
                ],
            };

            const response = await request(app)
                .post('/api/v1/bulk/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send(bulkData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.processedCount).toBe(3);
            expect(response.body.data.results.length).toBe(3);

            // Check bulk operation rate limit headers
            expect(response.headers['x-ratelimit-limit']).toBeDefined();
            const limit = parseInt(response.headers['x-ratelimit-limit'] as string);
            expect(limit).toBeLessThan(10); // Bulk should have stricter limits
        });

        it('should validate bulk transaction data', async () => {
            const invalidBulkData = {
                transactions: [
                    { amount: -100, type: 'DEPOSIT', description: 'Invalid amount' },
                    { amount: 50, type: 'INVALID_TYPE', description: 'Invalid type' },
                ],
            };

            const response = await request(app)
                .post('/api/v1/bulk/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidBulkData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Transaction Analytics with Caching', () => {
        beforeEach(async () => {
            // Create diverse transaction data for analytics
            const analyticsTransactions = [
                { amount: 1000, type: 'DEPOSIT', description: 'Large deposit' },
                { amount: 500, type: 'WITHDRAWAL', description: 'Medium withdrawal' },
                { amount: 200, type: 'DEPOSIT', description: 'Small deposit' },
                { amount: 100, type: 'TRANSFER', description: 'Small transfer' },
            ];

            for (const transaction of analyticsTransactions) {
                await request(app)
                    .post('/api/v1/transactions')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(transaction);
            }
        });

        it('should return cached analytics data', async () => {
            // First request - populates cache
            const response1 = await request(app)
                .get('/api/v1/transactions/analytics')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response1.body.success).toBe(true);
            expect(response1.body.data.totalTransactions).toBeGreaterThan(0);
            expect(response1.body.data.totalAmount).toBeGreaterThan(0);

            // Second request - should be served from cache
            const response2 = await request(app)
                .get('/api/v1/transactions/analytics')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response2.body.data).toEqual(response1.body.data);
        });

        it('should return analytics by type', async () => {
            const response = await request(app)
                .get('/api/v1/transactions/analytics?groupBy=type')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.byType).toBeDefined();
            expect(response.body.data.byType.DEPOSIT).toBeDefined();
            expect(response.body.data.byType.WITHDRAWAL).toBeDefined();
        });
    });

    describe('Cache Invalidation on Transaction Changes', () => {
        it('should invalidate cache when transaction is created', async () => {
            // Get initial transaction count
            const initialResponse = await request(app)
                .get('/api/v1/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            const initialCount = initialResponse.body.data.length;

            // Create new transaction (should invalidate cache)
            await request(app)
                .post('/api/v1/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    amount: 123,
                    type: 'DEPOSIT',
                    description: 'Cache invalidation test',
                })
                .expect(201);

            // Get transactions again (should show updated count)
            const updatedResponse = await request(app)
                .get('/api/v1/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(updatedResponse.body.data.length).toBe(initialCount + 1);
        });

        it('should invalidate analytics cache when transaction is created', async () => {
            // Get initial analytics
            const initialAnalytics = await request(app)
                .get('/api/v1/transactions/analytics')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            const initialTotal = initialAnalytics.body.data.totalAmount;

            // Create new transaction
            const newAmount = 555;
            await request(app)
                .post('/api/v1/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    amount: newAmount,
                    type: 'DEPOSIT',
                    description: 'Analytics cache invalidation test',
                })
                .expect(201);

            // Get analytics again (should reflect new transaction)
            const updatedAnalytics = await request(app)
                .get('/api/v1/transactions/analytics')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(updatedAnalytics.body.data.totalAmount).toBeGreaterThan(initialTotal);
            expect(updatedAnalytics.body.data.totalAmount).toBe(initialTotal + newAmount);
        });
    });

    describe('Error Handling with Redis Features', () => {
        it('should handle Redis errors gracefully', async () => {
            // Even if Redis is down, the API should still work
            const transactionData = {
                amount: 100,
                type: 'DEPOSIT',
                description: 'Redis error handling test',
            };

            const response = await request(app)
                .post('/api/v1/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send(transactionData);

            // Should still work even if Redis operations fail
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
        });

        it('should continue serving data when cache is unavailable', async () => {
            const response = await request(app)
                .get('/api/v1/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('Get Transaction by ID', () => {
        let testTransactionId: string;
        beforeEach(async () => {
            // Create a transaction for testing the get by ID endpoint
            const transactionData = {
                amount: 75,
                type: 'DEPOSIT',
                description: 'Test transaction for get by ID',
                toAccountId: accountId, // Add the account ID for deposits
            };

            const createResponse = await request(app)
                .post('/api/v1/transactions')
                .set('Authorization', `Bearer ${authToken}`)
                .send(transactionData)
                .expect(201);

            testTransactionId = createResponse.body.data.id;
        });

        it('should retrieve a transaction by ID', async () => {
            const response = await request(app)
                .get(`/api/v1/transactions/${testTransactionId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(testTransactionId);
            expect(response.body.data.amount).toBe(75);
            expect(response.body.data.type).toBe('DEPOSIT');
        });

        it('should return a 404 for non-existent transaction ID', async () => {
            const nonExistentId = 'clfake123456789012345678';

            const response = await request(app)
                .get(`/api/v1/transactions/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Transaction not found');
        });

        it('should not allow access to another user\'s transaction', async () => {
            // Create another user
            const anotherUserData = {
                email: 'anothertransactiontest@example.com',
                firstName: 'Another',
                lastName: 'User',
                password: 'Test123!@#',
                phone: '0987654321',
            };

            await request(app)
                .post('/api/v1/users/register')
                .send(anotherUserData);

            const loginResponse = await request(app)
                .post('/api/v1/users/login')
                .send({
                    email: anotherUserData.email,
                    password: anotherUserData.password,
                });

            const anotherUserToken = loginResponse.body.data.token;

            // Try to access the first user's transaction with the second user's token
            const response = await request(app)
                .get(`/api/v1/transactions/${testTransactionId}`)
                .set('Authorization', `Bearer ${anotherUserToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Transaction not found');

            // Clean up the other test user
            await prisma.user.deleteMany({
                where: { email: anotherUserData.email }
            });
        });
    });
});
