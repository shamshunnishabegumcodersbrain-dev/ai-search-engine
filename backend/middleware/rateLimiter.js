const rateLimit = require('express-rate-limit');
const { logger } = require('../logger');

const _makeHandler = (label) => (req, res, next, options) => {
  logger.warn(`Rate limit exceeded [${label}]`, {
    ip: req.ip,
    path: req.path,
    method: req.method,
    userAgent: req.get('User-Agent')
  });
  res.status(429).json(options.message);
};

const _skip = (req) => process.env.NODE_ENV === 'test';

// Search — 30 requests per minute
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many search requests. Please wait 1 minute before searching again.',
    retryAfter: 60
  },
  handler: _makeHandler('search'),
  skip: _skip
});

// Voice transcription — 10 requests per minute (calls paid Groq API)
const voiceLimiter = rateLimit({
  windowMs: 60000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many voice requests. Please wait 1 minute.',
    retryAfter: 60
  },
  handler: _makeHandler('voice'),
  skip: _skip
});

// Scrape trigger — 2 requests per 10 minutes (expensive background job)
const scrapeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Scrape trigger rate limit exceeded. Please wait 10 minutes.',
    retryAfter: 600
  },
  handler: _makeHandler('scrape'),
  skip: _skip
});

module.exports = { limiter, voiceLimiter, scrapeLimiter };