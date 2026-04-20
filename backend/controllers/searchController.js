const axios = require('axios');
const { logger } = require('../logger');

const search = async (req, res, next) => {
  const startTime = Date.now();
  const { q, page = 1, page_size = 10, search_type = 'web' } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Query must be at least 2 characters',
      results: [],
      total_results: 0,
      total_pages: 0,
    });
  }

  try {
    logger.info('Search request received', { query: q, page, page_size, search_type, ip: req.ip });

    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

    const response = await axios.post(
      `${pythonServiceUrl}/search`,
      {
        query: q,
        page: parseInt(page) || 1,
        page_size: parseInt(page_size) || 10,
        search_type: search_type || 'web',
      },
      {
        timeout: 60000,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const data = response.data;
    const latency = Date.now() - startTime;
    const latencySeconds = (data.latency_ms / 1000).toFixed(2);
    const formattedTotal = data.total_results
      ? `About ${data.total_results.toLocaleString()} results (${latencySeconds} seconds)`
      : `No results (${latencySeconds} seconds)`;

    logger.info('Search completed', {
      query: q,
      totalResults: data.total_results,
      source: data.source,
      latencyMs: latency,
      fromCache: data.from_cache,
    });

    return res.status(200).json({
      success: true,
      // Core search data
      query: data.query,
      page: data.page,
      page_size: data.page_size,
      search_type: data.search_type,
      results: data.results || [],
      total_results: data.total_results || 0,
      total_pages: data.total_pages || 0,
      // AI features
      ai_answer: data.ai_answer || '',
      source: data.source || 'unknown',
      // New enriched fields
      spell_fix: data.spell_fix || '',
      related_searches: data.related_searches || [],
      people_also_ask: data.people_also_ask || [],
      knowledge_panel: data.knowledge_panel || null,
      // Meta
      latency_ms: data.latency_ms || latency,
      formatted_result_count: formattedTotal,
      from_cache: data.from_cache || false,
    });

  } catch (error) {
    const latency = Date.now() - startTime;
    const errorBase = {
      success: false,
      results: [],
      total_results: 0,
      total_pages: 0,
      query: q,
      search_type,
      source: 'error',
      spell_fix: '',
      related_searches: [],
      people_also_ask: [],
      knowledge_panel: null,
      formatted_result_count: '',
      latency_ms: latency,
    };

    if (error.code === 'ECONNREFUSED') {
      logger.error('Python AI service not reachable', { query: q, latencyMs: latency });
      return res.status(503).json({
        ...errorBase,
        error: 'AI service is currently unavailable. Please start the Python service.',
        ai_answer: 'The AI service is not running. Please try again in a moment.',
      });
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      logger.error('Python AI service timeout', { query: q, latencyMs: latency });
      return res.status(504).json({
        ...errorBase,
        error: 'Search took too long. Please try a simpler query.',
        ai_answer: 'The search timed out. Please try a simpler query.',
      });
    }

    if (error.response) {
      logger.error('Python AI service returned error', { query: q, status: error.response.status });
      return res.status(error.response.status || 500).json({
        ...errorBase,
        error: error.response.data?.detail || 'AI service returned an error.',
        ai_answer: 'Something went wrong. Please try again.',
      });
    }

    next(error);
  }
};

module.exports = { search };