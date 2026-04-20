const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const { logger } = require('../logger');

router.get('/health', async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState;
    const mongoStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

    // Actually probe the Python service health endpoint
    let pythonStatus = 'unavailable';
    let pythonDetails = null;
    try {
      const resp = await axios.get(`${pythonServiceUrl}/health`, { timeout: 3000 });
      pythonStatus = 'ok';
      pythonDetails = resp.data;
    } catch {
      pythonStatus = 'unavailable';
    }

    const healthData = {
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      services: {
        server: 'running',
        mongodb: mongoStates[mongoStatus] || 'unknown',
        pythonService: {
          url: pythonServiceUrl,
          status: pythonStatus,
          ...(pythonDetails && {
            groq: pythonDetails.groq,
            model: pythonDetails.model,
            documents_indexed: pythonDetails.documents_indexed,
          })
        }
      },
      uptime: `${Math.floor(process.uptime())} seconds`
    };

    logger.info('Health check requested', { status: 'ok', pythonService: pythonStatus });

    res.status(200).json(healthData);

  } catch (error) {
    logger.error(`Health check failed: ${error.message}`);
    res.status(500).json({ success: false, status: 'error', error: error.message });
  }
});

module.exports = router;