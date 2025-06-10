import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { auth } from './middleware/auth';
import authRoutes from './routes/auth';
import analysisRoutes from './routes/analysis';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/analysis', auth, analysisRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

export default app; 