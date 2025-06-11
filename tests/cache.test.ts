import request from 'supertest';
import app from '../src/app';
import redisClient from '../src/config/redis';
import prisma from '../src/config/database';

// Helper to login and get a JWT token for a test user
async function getAuthToken() {
    // Create or find a test user
    const email = `cachetestuser+${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            email,
            password: await require('bcryptjs').hash(password, 10),
            firstName: 'Cache',
            lastName: 'Tester',
            isActive: true,
            role: 'CUSTOMER',
        },
    });
    // Login
    const res = await request(app)
        .post('/api/v1/users/login')
        .send({ email, password });
    return res.body.data.token;
}

describe('API Response Caching', () => {
    let token: string;
    beforeAll(async () => {
        await redisClient.connect();
        token = await getAuthToken();
    });
    afterAll(async () => {
        await redisClient.quit();
        await prisma.$disconnect();
    });

    it('should cache transaction list responses', async () => {
        // First request (should MISS)
        const res1 = await request(app)
            .get('/api/v1/transactions?page=1&limit=2')
            .set('Authorization', `Bearer ${token}`);
        expect(res1.status).toBe(200);
        expect(res1.headers['x-cache']).toBe('MISS');
        // Second identical request (should HIT)
        const res2 = await request(app)
            .get('/api/v1/transactions?page=1&limit=2')
            .set('Authorization', `Bearer ${token}`);
        expect(res2.status).toBe(200);
        expect(res2.headers['x-cache']).toBe('HIT');
    });

    it('should cache account summary responses', async () => {
        const res1 = await request(app)
            .get('/api/v1/accounts/summary')
            .set('Authorization', `Bearer ${token}`);
        expect(res1.status).toBe(200);
        expect(res1.headers['x-cache']).toBe('MISS');
        const res2 = await request(app)
            .get('/api/v1/accounts/summary')
            .set('Authorization', `Bearer ${token}`);
        expect(res2.status).toBe(200);
        expect(res2.headers['x-cache']).toBe('HIT');
    });

    it('should cache account transaction list responses', async () => {
        // Get a real account id for the user
        const accountsRes = await request(app)
            .get('/api/v1/accounts')
            .set('Authorization', `Bearer ${token}`);
        expect(accountsRes.status).toBe(200);
        const accountId = accountsRes.body.data[0]?.id;
        if (!accountId) return;
        const res1 = await request(app)
            .get(`/api/v1/accounts/${accountId}/transactions?page=1&limit=2`)
            .set('Authorization', `Bearer ${token}`);
        expect(res1.status).toBe(200);
        expect(res1.headers['x-cache']).toBe('MISS');
        const res2 = await request(app)
            .get(`/api/v1/accounts/${accountId}/transactions?page=1&limit=2`)
            .set('Authorization', `Bearer ${token}`);
        expect(res2.status).toBe(200);
        expect(res2.headers['x-cache']).toBe('HIT');
    });
});
