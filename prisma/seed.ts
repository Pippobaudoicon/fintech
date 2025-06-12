// Seed script for users, accounts, notifications, etc.
import prisma from '../src/config/database';
import { hashPassword, generateAccountNumber } from '../src/utils/helpers';
import { UserRole, KYCStatus } from '@prisma/client';

async function main() {
    // Seed users
    const usersData = [
        {
            email: 'alice@example.com',
            password: await hashPassword('Password123!'),
            firstName: 'Alice',
            lastName: 'Anderson',
            role: UserRole.CUSTOMER,
            isActive: true,
            isVerified: true,
            kycStatus: KYCStatus.APPROVED,
        },
        {
            email: 'bob@example.com',
            password: await hashPassword('Password123!'),
            firstName: 'Bob',
            lastName: 'Brown',
            role: UserRole.CUSTOMER,
            isActive: true,
            isVerified: false,
            kycStatus: KYCStatus.IN_PROGRESS,
        },
        {
            email: 'admin@example.com',
            password: await hashPassword('AdminPass!'),
            firstName: 'Admin',
            lastName: 'User',
            role: UserRole.ADMIN,
            isActive: true,
            isVerified: true,
            kycStatus: KYCStatus.APPROVED,
        },
    ];

    const users: any[] = [];
    for (const userData of usersData) {
        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {},
            create: userData,
        });
        users.push(user);
    }

    // Seed accounts for each user
    for (const user of users) {
        await prisma.account.create({
            data: {
                userId: user.id,
                accountNumber: generateAccountNumber(),
                accountType: 'CHECKING',
                balance: 1000.00,
                currency: 'USD',
                isActive: true,
            },
        });
        await prisma.account.create({
            data: {
                userId: user.id,
                accountNumber: generateAccountNumber(),
                accountType: 'SAVINGS',
                balance: 5000.00,
                currency: 'USD',
                isActive: true,
            },
        });
    }

    // Seed notifications for each user
    for (const user of users) {
        await prisma.notification.create({
            data: {
                userId: user.id,
                title: 'Welcome!',
                message: `Hello ${user.firstName}, welcome to Fintech API!`,
                type: 'info',
            },
        });
    }

    // Seed transactions for each user (simple example: deposit and withdrawal for first account)
    for (const user of users) {
        const accounts = await prisma.account.findMany({ where: { userId: user.id } });
        if (accounts.length > 0) {
            // Deposit
            await prisma.transaction.create({
                data: {
                    userId: user.id,
                    amount: 200.00,
                    currency: 'USD',
                    type: 'DEPOSIT',
                    status: 'COMPLETED',
                    description: 'Initial deposit',
                    toAccountId: accounts[0].id,
                },
            });
            // Withdrawal
            await prisma.transaction.create({
                data: {
                    userId: user.id,
                    amount: 50.00,
                    currency: 'USD',
                    type: 'WITHDRAWAL',
                    status: 'COMPLETED',
                    description: 'ATM withdrawal',
                    fromAccountId: accounts[0].id,
                },
            });
            // Transfer (if user has more than one account)
            if (accounts.length > 1) {
                await prisma.transaction.create({
                    data: {
                        userId: user.id,
                        amount: 100.00,
                        currency: 'USD',
                        type: 'TRANSFER',
                        status: 'COMPLETED',
                        description: 'Transfer between accounts',
                        fromAccountId: accounts[0].id,
                        toAccountId: accounts[1].id,
                    },
                });
            }
        }
    }

    // Seed audit logs for each user
    for (const user of users) {
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'USER_SEED',
                resource: 'User',
                details: { seeded: true },
                ipAddress: '127.0.0.1',
                userAgent: 'seed-script',
            },
        });
    }

    // Optionally seed more: transactions, audit logs, etc.
}

main()
    .then(async () => {
        await prisma.$disconnect();
        console.log('Seed completed.');
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
