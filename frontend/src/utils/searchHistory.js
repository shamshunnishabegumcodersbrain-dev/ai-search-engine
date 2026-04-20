import { MAX_RECENT_SEARCHES } from './constants';

const KEY = 'ai_search_recent';

export function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function saveRecent(query) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const existing = getRecent().filter(q => q !== trimmed);
  const updated = [trimmed, ...existing].slice(0, MAX_RECENT_SEARCHES);
  localStorage.setItem(KEY, JSON.stringify(updated));
}

export function clearRecent() {
  localStorage.removeItem(KEY);
}