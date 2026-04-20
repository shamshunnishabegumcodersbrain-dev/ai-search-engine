const { logger } = require('../logger');

const validateSearchQuery = (req, res, next) => {
  let { q, page, page_size } = req.query;

  // Check if query exists
  if (!q || q.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Search query is required. Please provide a query using ?q=your+search+term'
    });
  }

  // Strip HTML tags to prevent XSS
  q = q.replace(/<[^>]*>/g, '');

  // Remove special characters that could cause issues
  q = q.replace(/[<>{}|\\^`]/g, '');

  // Trim whitespace
  q = q.trim();

  // Enforce max length of 200 characters
  if (q.length > 200) {
    logger.warn(`Query too long, truncating`, {
      originalLength: q.length,
      ip: req.ip
    });
    q = q.substring(0, 200);
  }

  // Check minimum length
  if (q.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Search query must be at least 2 characters long.'
    });
  }

  // Validate and sanitize page number
  page = parseInt(page) || 1;
  if (page < 1) page = 1;
  if (page > 100) page = 100;

  // Validate and sanitize page_size
  page_size = parseInt(page_size) || 10;
  if (page_size < 1) page_size = 10;
  if (page_size > 50) page_size = 50;

  // Attach sanitized values back to request
  req.query.q = q;
  req.query.page = page;
  req.query.page_size = page_size;

  logger.info(`Search query validated`, {
    query: q,
    page,
    page_size,
    ip: req.ip
  });

  next();
};

module.exports = { validateSearchQuery };