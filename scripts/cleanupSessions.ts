// Session cleanup script for scheduled jobs or manual use
import prisma from '../src/config/database';

async function cleanupExpiredSessions() {
    const result = await prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
    });
    console.log(`Deleted ${result.count} expired sessions.`);
    await prisma.$disconnect();
}

cleanupExpiredSessions().catch((err) => {
    console.error('Session cleanup failed:', err);
    process.exit(1);
});
