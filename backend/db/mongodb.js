const mongoose = require('mongoose');
const { logger } = require('../logger');

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    logger.warn('MONGODB_URI not set — MongoDB features disabled. Server will still run.');
    return;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      dbName: 'search_db',
      serverSelectionTimeoutMS: 5000,  // fail fast instead of hanging
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);
    logger.info(`Database name: ${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Will attempt reconnect automatically.');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });

  } catch (error) {
    // Non-fatal: log the error but do NOT exit the process.
    // The app can still serve searches without MongoDB.
    logger.error(`MongoDB connection failed: ${error.message}`);
    logger.warn('Continuing without MongoDB — search history persistence is unavailable.');
  }
};

module.exports = connectDB;