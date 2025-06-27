import express from 'express';
import cors from 'cors';
// import { sequelize } from './config/database';
import analysisRoutes from './routes/analysis';
import authRoutes from './routes/auth';
import { auth } from './middleware/auth';

// Set environment variables
// process.env.DATABASE_URL = 'postgres://postgres:postgres@postgres:5432/secure_audit';
process.env.PORT = process.env.PORT || '3001';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();
const port = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://secure-audit.nsisonglabs.xyz',
    'https://secure-audit-frontend.pages.dev'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// Connect to PostgreSQL (disabled for now)
// sequelize.authenticate()
//   .then(() => {
//     console.log('Connected to PostgreSQL');
//     return sequelize.sync();
//   })
//   .then(() => console.log('Database synchronized'))
//   .catch(err => {
//     console.error('Database connection error:', err);
//     // Add more detailed error logging
//     if (err.original) {
//       console.error('Original error:', err.original);
//     }
//   });

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/analysis', analysisRoutes); // Public routes
app.use('/api/analysis/protected', auth, analysisRoutes); // Protected routes

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 