const axios = require('axios');
const { logger } = require('../logger');

const triggerScrape = async (req, res, next) => {
  // Require the scrape key on the backend side too
  const scrapeKey = req.headers['x-scrape-key'];
  if (!scrapeKey) {
    return res.status(401).json({
      success: false,
      error: 'Missing X-Scrape-Key header.'
    });
  }

  try {
    logger.info('Manual scrape trigger requested', {
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

    // Forward the scrape key so the Python service can validate it
    const response = await axios.post(
      `${pythonServiceUrl}/scrape`,
      {},
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-Scrape-Key': scrapeKey
        }
      }
    );

    logger.info('Scrape job triggered successfully', {
      jobId: response.data.job_id,
      status: response.data.status
    });

    res.status(200).json({
      success: true,
      message: 'Scrape job triggered successfully.',
      job_id: response.data.job_id,
      status: response.data.status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      logger.error('Python AI service not reachable for scraping', { error: error.message });
      return res.status(503).json({
        success: false,
        error: 'AI service is not running. Start the Python service first.',
        message: 'Run: cd ai-service && source venv/bin/activate && uvicorn main:app --reload'
      });
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      logger.error('Scrape trigger timeout', { error: error.message });
      return res.status(504).json({
        success: false,
        error: 'Scrape trigger timed out. The service may be busy.'
      });
    }

    if (error.response) {
      logger.error('Python service scrape error', {
        status: error.response.status,
        data: error.response.data
      });
      return res.status(error.response.status || 500).json({
        success: false,
        error: error.response.data?.detail || 'Failed to trigger scrape job.'
      });
    }

    next(error);
  }
};

module.exports = { triggerScrape };