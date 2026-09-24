import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from './config/env.js';

import authRoutes from './routes/auth.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import reportRoutes from './routes/report.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'OK',
    data: {
      status: 'up',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      model: env.OPENROUTER_MODEL,
      aiConfigured: Boolean(env.OPENROUTER_API_KEY),
      maxFileSize: env.MAX_FILE_SIZE,
      environment: env.NODE_ENV,
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use('/api', (req, res, next) => {
  notFound(req, res, next);
});

app.use(errorHandler);

export default app;
