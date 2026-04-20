const express = require('express');
const router = express.Router();
const { transcribeVoice } = require('../controllers/voiceController');

router.post('/voice-transcribe', transcribeVoice);

module.exports = router;