import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from './config/env.js';

import authRoutes from './routes/auth.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import reportRoutes from './routes/report.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import copyleaksRoutes from './routes/copyleaks.routes.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);


const allowedOrigins = [
  "http://localhost:5173",
  "https://hackathon-iepp.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.options("*", cors());
// Collect all configured origins from environment variables and defaults
const configuredOrigins = [
  env.FRONTEND_URL,
  env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]
  .flatMap((url) => (url ? String(url).split(',') : []))
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOriginsSet = new Set(configuredOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (curl, server-to-server, Copyleaks webhooks)
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/+$/, '');
      if (allowedOriginsSet.has(cleanOrigin) || allowedOriginsSet.has('*')) {
        return callback(null, true);
      }

      // In development, allow any localhost port
      if (env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
        return callback(null, true);
      }

      // Disallow without crashing server
      return callback(null, false);
    },
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
      copyleaksConfigured: Boolean(env.COPYLEAKS_API_KEY && env.COPYLEAKS_EMAIL),
      maxFileSize: env.MAX_FILE_SIZE,
      environment: env.NODE_ENV,
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/copyleaks', copyleaksRoutes);

app.use('/api', (req, res, next) => {
  notFound(req, res, next);
});

app.use(errorHandler);

export default app;
