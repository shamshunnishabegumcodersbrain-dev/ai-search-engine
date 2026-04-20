export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'AI Search Engine';
export const MAX_RECENT_SEARCHES = parseInt(import.meta.env.VITE_MAX_RECENT_SEARCHES) || 10;
export const RESULTS_PER_PAGE = 10;