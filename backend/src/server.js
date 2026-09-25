import app from './app.js';
import env from './config/env.js';
import { connectDB } from './config/db.js';

async function main() {
  try {
    await connectDB();
    console.log('[mongo] connected');
  } catch (err) {
    console.error('[mongo] failed to connect:', err.message);
    console.error('        Set MONGODB_URI in backend/.env and make sure MongoDB is running.');
    process.exit(1);
  }

  if (!env.OPENROUTER_API_KEY) {
    console.warn('[openrouter] OPENROUTER_API_KEY is not set — analysis requests will fail.');
  }
  if (!env.JWT_SECRET) {
    console.warn('[auth] JWT_SECRET is not set — auth requests will fail.');
  }

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    const address = server.address();
    console.log(`[server] VeriWrite AI API listening on http://localhost:${env.PORT}/api`);
    console.log(`[server] bound to:`, address);
    console.log(`[server] model: ${env.OPENROUTER_MODEL}`);
    console.log(`[server] client: ${env.CLIENT_URL}`);
  }).on('error', (err) => {
    console.error('[server] listen error:', err);
  });

  const shutdown = (signal) => () => {
    console.log(`\n[server] ${signal} received, shutting down...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on('SIGINT', shutdown('SIGINT'));
  process.on('SIGTERM', shutdown('SIGTERM'));
  process.on('unhandledRejection', (err) => {
    console.error('[server] unhandled rejection:', err?.stack || err);
  });
  process.on('uncaughtException', (err) => {
    console.error('[server] uncaught exception:', err?.stack || err);
  });
}

main();
