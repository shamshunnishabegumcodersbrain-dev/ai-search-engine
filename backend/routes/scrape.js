const express = require('express');
const router = express.Router();
const { triggerScrape } = require('../controllers/scrapeController');

// POST /api/scrape/trigger
router.post('/scrape/trigger', triggerScrape);

module.exports = router;