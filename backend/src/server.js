import app from './app.js';
import config from './config/env.js';
import { pool } from './config/database.js';

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Backend server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} received. Starting graceful shutdown.`);

  const forceExitTimer = setTimeout(() => {
    console.error('Graceful shutdown timed out.');
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  server.close(async (error) => {
    try {
      await pool.end();
      if (error) {
        console.error('HTTP server shutdown error:', error);
        process.exitCode = 1;
      } else {
        console.log('HTTP server and database pool closed.');
      }
    } catch (shutdownError) {
      console.error('Database shutdown error:', shutdownError.message);
      process.exitCode = 1;
    } finally {
      clearTimeout(forceExitTimer);
    }
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
