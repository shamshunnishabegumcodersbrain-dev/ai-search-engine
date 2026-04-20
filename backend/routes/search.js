const express = require('express');
const router = express.Router();
const { validateSearchQuery } = require('../middleware/validate');
const { search } = require('../controllers/searchController');

// GET /api/search?q=query&page=1&page_size=10
router.get('/search', validateSearchQuery, search);

module.exports = router;