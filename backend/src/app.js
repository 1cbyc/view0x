const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ContractScanner } = require('../../scanner-engine/dist/scanner/ContractScanner');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

// Rate limiter for /scan
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many requests, try again later.'
});
app.use('/scan', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Scan endpoint
app.post('/scan', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, error: 'Solidity code required' });
  }
  try {
    // Dynamically import the scanner engine (in case of hot reload)
    const scanner = new ContractScanner(code);
    const result = await scanner.scan();
    res.json(result);
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ success: false, error: 'Failed to scan contract', details: err.message });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});

// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
});