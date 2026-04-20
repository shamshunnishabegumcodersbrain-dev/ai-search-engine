import axios from 'axios';
import { API_URL } from './constants';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

export async function searchQuery(
  query,
  page = 1,
  pageSize = 10,
  searchType = 'web',
  signal = null,
  tbs = ''          // ← NEW: time-based filter e.g. 'qdr:d'
) {
  const response = await api.get('/api/search', {
    params: {
      q: query,
      page,
      page_size: pageSize,
      search_type: searchType,
      ...(tbs && { tbs }),   // only include if set
    },
    signal,
  });
  return response.data;
}

export default api;

/**
 * Send base64 audio to backend for Groq Whisper transcription.
 */
export async function transcribeVoice(audioBase64, language = 'en', audioFormat = 'webm') {
  const response = await api.post('/api/voice-transcribe', {
    audio_base64: audioBase64,
    language,
    audio_format: audioFormat,
  });
  return response.data;
}

/**
 * Summarize a webpage via the backend.
 * Returns { summary: string }
 */
export async function summarizePage(url, title = '') {
  const response = await api.post('/api/summarize', { url, title });
  return response.data;
}