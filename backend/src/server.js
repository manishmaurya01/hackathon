import app from './app.js';
import env from './config/env.js';
import { connectDB } from './config/db.js';

function maskMongoUri(message) {
  if (!message) return '';
  return String(message).replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)[^@]+@/i, '$1***@');
}

async function main() {
  try {
    await connectDB();
    console.log('[mongo] connected successfully');
  } catch (err) {
    console.error('[mongo] failed to connect:', maskMongoUri(err.message));
    console.error('        Set MONGODB_URI in environment variables and verify MongoDB Atlas network access (0.0.0.0/0).');
    process.exit(1);
  }

  if (!env.OPENROUTER_API_KEY) {
    console.warn('[openrouter] OPENROUTER_API_KEY is not set — AI analysis requests will fail.');
  }
  if (!env.JWT_SECRET) {
    console.warn('[auth] JWT_SECRET is not set — authentication requests will fail.');
  }
  if (!env.COPYLEAKS_API_KEY || !env.COPYLEAKS_EMAIL) {
    console.warn('[copyleaks] COPYLEAKS_API_KEY or COPYLEAKS_EMAIL not set — plagiarism scans will fail.');
  }

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    const address = server.address();
    console.log(`[server] VeriWrite AI API listening on port ${env.PORT}`);
    console.log(`[server] bound to:`, address);
    console.log(`[server] model: ${env.OPENROUTER_MODEL}`);
    console.log(`[server] client: ${env.CLIENT_URL}`);
  }).on('error', (err) => {
    console.error('[server] listen error:', err);
  });

  const shutdown = (signal) => () => {
    console.log(`\n[server] ${signal} received, shutting down gracefully...`);
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
