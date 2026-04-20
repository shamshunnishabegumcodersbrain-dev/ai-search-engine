const express = require('express');
const router = express.Router();
const { summarize } = require('../controllers/summarizeController');

// POST /api/summarize
router.post('/summarize', summarize);

module.exports = router;