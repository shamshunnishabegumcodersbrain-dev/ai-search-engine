const axios = require('axios');
const { logger } = require('../logger');

const transcribeVoice = async (req, res) => {
  const { audio_base64, language = 'en', audio_format = 'webm' } = req.body;

  if (!audio_base64) {
    return res.status(400).json({ success: false, error: 'No audio data provided' });
  }

  try {
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

    const response = await axios.post(
      `${pythonServiceUrl}/voice-transcribe`,
      { audio_base64, language, audio_format },
      { timeout: 30000, headers: { 'Content-Type': 'application/json' } }
    );

    logger.info('Voice transcribed', { language, chars: response.data.transcript?.length });
    return res.status(200).json(response.data);

  } catch (error) {
    logger.error('Voice transcription failed', { error: error.message });

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, error: 'AI service not running' });
    }

    return res.status(500).json({
      success: false,
      error: error.response?.data?.detail || 'Voice transcription failed',
    });
  }
};

module.exports = { transcribeVoice };