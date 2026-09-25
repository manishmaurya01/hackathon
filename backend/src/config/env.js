import dotenv from 'dotenv';

dotenv.config();

const env = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/veriwrite',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  COPYLEAKS_API_KEY: process.env.COPYLEAKS_API_KEY,
  COPYLEAKS_EMAIL: process.env.COPYLEAKS_EMAIL,
  COPYLEAKS_SANDBOX: process.env.COPYLEAKS_SANDBOX === 'true',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MAX_FILE_SIZE: Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export default env;