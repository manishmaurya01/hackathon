import mongoose from 'mongoose';
import env from './env.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
  return mongoose.connection;
}

mongoose.connection.on('error', (err) => {
  console.error('[mongo] connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[mongo] disconnected');
});
