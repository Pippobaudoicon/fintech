import { Router } from 'express';
import userRoutes from './userRoutes';
import accountRoutes from './accountRoutes';
import transactionRoutes from './transactionRoutes';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Fintech API',
    version: '1.0.0',
  });
});

// API routes
router.use('/users', userRoutes);
router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);

export default router;
