const axios = require('axios');
const { logger } = require('../logger');

const summarize = async (req, res, next) => {
  const { url, title = '' } = req.body;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ success: false, error: 'A valid URL is required' });
  }

  try {
    logger.info('Summarize request', { url: url.slice(0, 80) });

    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
    const response = await axios.post(
      `${pythonServiceUrl}/summarize`,
      { url, title },
      { timeout: 20000, headers: { 'Content-Type': 'application/json' } }
    );

    return res.status(200).json({
      success: true,
      summary: response.data.summary || '',
      url,
    });

  } catch (error) {
    logger.error('Summarize failed', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Could not summarize this page. Please try again.',
    });
  }
};

module.exports = { summarize };