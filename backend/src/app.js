const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { scanContract } = require('../../scanner-engine/src/index');

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
