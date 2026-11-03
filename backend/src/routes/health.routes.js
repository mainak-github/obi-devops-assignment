import { Router } from 'express';
import { checkDatabaseConnection } from '../config/database.js';

const router = Router();

router.get('/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'backend',
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', async (_request, response) => {
  try {
    await checkDatabaseConnection();

    return response.status(200).json({
      status: 'ready',
      database: 'connected',
    });
  } catch (error) {
    console.error('Database readiness check failed:', error.message);

    return response.status(503).json({
      status: 'not_ready',
      database: 'disconnected',
    });
  }
});

router.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'backend',
  });
});

export default router;
