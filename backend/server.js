const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { helmetMiddleware } = require('./middleware/security');
const { limiter, voiceLimiter, scrapeLimiter } = require('./middleware/rateLimiter');
const { httpLogger, logger } = require('./logger');
const connectDB = require('./db/mongodb');
const { errorHandler } = require('./middleware/errorHandler');

const searchRoutes = require('./routes/search');
const healthRoutes = require('./routes/health');
const scrapeRoutes = require('./routes/scrape');
const voiceRoutes = require('./routes/voice');

dotenv.config();

const app = express();

// Connect to MongoDB (non-fatal — app runs without it)
connectDB();

// Security first
app.use(helmetMiddleware);

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-Scrape-Key']
}));

// Body parser — default 10kb for most routes
app.use((req, res, next) => {
  // Voice endpoint receives base64 audio — needs a higher limit (~5MB decoded = ~6.8MB base64)
  const limit = req.path === '/api/voice-transcribe' ? '8mb' : '10kb';
  express.json({ limit })(req, res, next);
});

// HTTP request logger
app.use(httpLogger);

// Rate limiters
app.use('/api/search', limiter);
app.use('/api/voice-transcribe', voiceLimiter);
app.use('/api/scrape', scrapeLimiter);

// Routes
app.use('/api', searchRoutes);
app.use('/api', healthRoutes);
app.use('/api', scrapeRoutes);
app.use('/api', voiceRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`
  });
});

// Global error handler — must be last
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`CORS origin: ${process.env.CORS_ORIGIN}`);
});

module.exports = app;