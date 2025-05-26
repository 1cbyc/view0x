 const express = require('express');
 const cors = require('cors');
 const helmet = require('helmet');
 const rateLimit = require('express-rate-limit');
// const { scanContract } = require('../../scanner-engine/src/index');
 const { scanContract } = require('../../scanner-engine/src/index');
 const { getCache, setCache } = require('./services/cache');
 const crypto = require('crypto');


 const app = express();
 app.use(express.json());
 app.use(cors());
 app.use(helmet());

 // rate limiter
 const limiter = rateLimit({
   windowMs: 60 * 1000,
   max: 10,
   message: 'Too many requests, try again later.'
 });
 app.use('/scan', limiter);

 // to scan endpoint
 app.post('/scan', (req, res) => {
   const { code } = req.body;

   if (!code) {
     return res.status(400).json({ success: false, error: 'Solidity code required' });
   }

   const result = scanContract(code);
   res.json(result);
 });

 // to start the server
 const PORT = process.env.PORT || 4000;
 app.listen(PORT, () => {
   console.log(`Backend API running on http://localhost:${PORT}`);
 });
//// updating here
//const express = require('express');
//const cors = require('cors');
//const helmet = require('helmet');
//const morgan = require('morgan');
//const compression = require('compression');
//const rateLimit = require('express-rate-limit');
//require('express-async-errors');
//require('dotenv').config();
//
//// Import routes
//const authRoutes = require('./routes/auth');
//const scanRoutes = require('./routes/scan');
//const userRoutes = require('./routes/user');
//const reportRoutes = require('./routes/report');
//
//// Import middleware
//const errorHandler = require('./middleware/errorHandler');
//const authenticateToken = require('./middleware/auth');
//
//const app = express();
//const PORT = process.env.PORT || 5000;
//
//// Security middleware
//app.use(helmet({
//  crossOriginEmbedderPolicy: false,
//  contentSecurityPolicy: {
//    directives: {
//      defaultSrc: ["'self'"],
//      styleSrc: ["'self'", "'unsafe-inline'"],
//      scriptSrc: ["'self'"],
//      imgSrc: ["'self'", "data:", "https:"],
//    },
//  },
//}));
//
//// CORS configuration
//app.use(cors({
//  origin: process.env.NODE_ENV === 'production'
//    ? ['https://your-domain.com']
//    : ['http://localhost:3000'],
//  credentials: true,
//}));
//
//// Rate limiting
//const limiter = rateLimit({
//  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000, // 15 minutes
//  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
//  message: {
//    error: 'Too many requests from this IP, please try again later.',
//  },
//  standardHeaders: true,
//  legacyHeaders: false,
//});
//
//// Scanning rate limit (more restrictive)
//const scanLimiter = rateLimit({
//  windowMs: 60 * 1000, // 1 minute
//  max: 10, // 10 scans per minute
//  message: {
//    error: 'Too many scan requests, please try again later.',
//  },
//});
//
//app.use(limiter);
//app.use(compression());
//app.use(morgan('combined'));
//app.use(express.json({ limit: '10mb' }));
//app.use(express.urlencoded({ extended: true, limit: '10mb' }));
//
//// Health check endpoint
//app.get('/health', (req, res) => {
//  res.json({
//    status: 'OK',
//    timestamp: new Date().toISOString(),
//    uptime: process.uptime(),
//    environment: process.env.NODE_ENV
//  });
//});
//
//// API routes
//app.use('/api/auth', authRoutes);
//app.use('/api/scan', scanLimiter, scanRoutes);
//app.use('/api/user', authenticateToken, userRoutes);
//app.use('/api/reports', authenticateToken, reportRoutes);
//
//// Root endpoint
//app.get('/', (req, res) => {
//  res.json({
//    message: 'SecureAudit API',
//    version: '1.0.0',
//    documentation: '/api/docs',
//  });
//});
//
//// 404 handler
//app.use('*', (req, res) => {
//  res.status(404).json({
//    error: 'Endpoint not found',
//    path: req.originalUrl,
//  });
//});
//
//// Error handling middleware
//app.use(errorHandler);
//
//// Start server
//app.listen(PORT, () => {
//  console.log(`🚀 Server running on port ${PORT}`);
//  console.log(`📚 Environment: ${process.env.NODE_ENV}`);
//  console.log(`🔗 API URL: http://localhost:${PORT}`);
//});
//
//module.exports = app;