import { Router } from 'express';

const router = Router();

router.get('/status', (_request, response) => {
  response.status(200).json({
    success: true,
    message: 'Three-tier application backend is running',
    service: 'backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

export default router;
