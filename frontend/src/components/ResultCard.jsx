import { useState, useEffect } from 'react';
import api from '../utils/api';

function getBookmarks() {
  try { return JSON.parse(localStorage.getItem('bookmarks') || '[]'); } catch { return []; }
}
function toggleBookmark(result) {
  const existing = getBookmarks();
  const idx = existing.findIndex((b) => b.url === result.url);
  let updated;
  if (idx >= 0) {
    updated = existing.filter((_, i) => i !== idx);
  } else {
    updated = [{ title: result.title, url: result.url, description: result.description, savedAt: Date.now() }, ...existing].slice(0, 50);
  }
  localStorage.setItem('bookmarks', JSON.stringify(updated));
  return idx < 0;
}
function isBookmarked(url) {
  return getBookmarks().some((b) => b.url === url);
}

export default function ResultCard({ result, searchType }) {
  const { title, url, description, source_site, date, thumbnail } = result;
  const hasValidUrl = url && url.startsWith('http');

  const [summary, setSummary]         = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [bookmarked, setBookmarked]   = useState(false);

  useEffect(() => {
    if (hasValidUrl) setBookmarked(isBookmarked(url));
  }, [url, hasValidUrl]);

  const getFavicon = (siteUrl) => {
    try { return `https://www.google.com/s2/favicons?domain=${new URL(siteUrl).origin}&sz=32`; }
    catch { return null; }
  };

  const getBreadcrumb = (siteUrl) => {
    try {
      const u = new URL(siteUrl);
      const host = u.hostname.replace('www.', '');
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length === 0) return host;
      return [host, ...parts.slice(0, 2)].join(' › ');
    } catch { return source_site || siteUrl; }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const now = new Date();
      const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
  };

  const handleSummarize = async () => {
    if (summary) { setSummary(''); return; }
    setSummarizing(true);
    setSummaryError('');
    try {
      const res = await api.post('/api/summarize', { url, title });
      setSummary(res.data.summary || 'No summary available.');
    } catch (err) {
      setSummaryError(err.response?.data?.error || 'Could not summarize this page.');
    } finally { setSummarizing(false); }
  };

  const handleBookmark = () => {
    const nowBookmarked = toggleBookmark(result);
    setBookmarked(nowBookmarked);
  };

  // ── Image result card ────────────────────────────────────────────────────
  if (searchType === 'images') {
    if (!thumbnail && !url) return null;
    return (
      // ── Mobile: smaller fixed width so 3+ fit per row ──
      <div className="inline-block w-28 sm:w-40 m-1 align-top">
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="block group" aria-label={`${title} (opens in new tab)`}>
          {thumbnail ? (
            <img src={thumbnail} alt={title}
              className="w-full h-20 sm:h-28 object-cover rounded-lg group-hover:opacity-90 transition-opacity"
              onError={(e) => { e.target.style.display = 'none'; }} loading="lazy" />
          ) : (
            <div className="w-full h-20 sm:h-28 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-xs">
              No image
            </div>
          )}
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">{title}</p>
        </a>
      </div>
    );
  }

  // ── Video result card ─────────────────────────────────────────────────────
  if (searchType === 'videos') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl px-3 sm:px-4 py-3 mb-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors flex gap-3">
        {thumbnail && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
            <div className="relative">
              <img src={thumbnail} alt={title}
                // ── Mobile: smaller thumbnail ──
                className="w-24 h-16 sm:w-32 sm:h-20 object-cover rounded-lg"
                onError={(e) => { e.target.style.display = 'none'; }} loading="lazy" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-black bg-opacity-60 rounded-full flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </div>
              </div>
            </div>
          </a>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {hasValidUrl && (
              <img src={getFavicon(url)} alt="" className="w-4 h-4 rounded-sm flex-shrink-0"
                onError={(e) => { e.target.style.display = 'none'; }} />
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {hasValidUrl ? getBreadcrumb(url) : (source_site || '')}
            </span>
          </div>
          {hasValidUrl ? (
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="text-blue-700 dark:text-blue-400 font-medium hover:underline text-sm leading-tight line-clamp-2 block mb-1">
              {title}
            </a>
          ) : (
            <p className="text-gray-800 dark:text-gray-200 font-medium text-sm mb-1 leading-tight">{title}</p>
          )}
          {description && (
            <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed line-clamp-2">{description}</p>
          )}
          {date && <span className="text-xs text-gray-400 mt-1 block">{formatDate(date)}</span>}
        </div>
      </div>
    );
  }

  // ── Standard web result card ──────────────────────────────────────────────
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl px-3 sm:px-4 py-3 mb-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
      {/* Site info row */}
      <div className="flex items-center gap-2 mb-1 min-w-0">
        {hasValidUrl && (
          <img src={getFavicon(url)} alt="" className="w-4 h-4 rounded-sm flex-shrink-0"
            onError={(e) => { e.target.style.display = 'none'; }} />
        )}
        {/* ── Mobile: truncate long breadcrumbs ── */}
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 min-w-0">
          {hasValidUrl ? getBreadcrumb(url) : (source_site || '')}
        </span>
        {date && (
          <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{formatDate(date)}</span>
        )}
      </div>

      {/* Title — slightly smaller on mobile */}
      {hasValidUrl ? (
        <a href={url} target="_blank" rel="noopener noreferrer"
          aria-label={`${title} (opens in new tab)`}
          className="group text-blue-700 dark:text-blue-400 text-base sm:text-lg font-medium hover:underline inline-flex items-start gap-1 mb-1 leading-tight">
          <span>{title}</span>
          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 mt-1.5 opacity-0 group-hover:opacity-60 transition-opacity"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      ) : (
        <p className="text-gray-800 dark:text-gray-200 text-base sm:text-lg font-medium mb-1 leading-tight">{title}</p>
      )}

      {/* Description */}
      {description && (
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{description}</p>
      )}

      {/* Action buttons */}
      {hasValidUrl && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <button onClick={handleSummarize} disabled={summarizing}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
              summary
                ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900 dark:border-purple-700 dark:text-purple-300'
                : 'border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600 dark:border-gray-600 dark:text-gray-400 dark:hover:text-purple-400'
            }`}>
            {summarizing ? (
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            {summarizing ? 'Summarizing…' : summary ? 'Hide' : 'Summarize'}
          </button>

          <button onClick={handleBookmark}
            title={bookmarked ? 'Remove bookmark' : 'Save result'}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              bookmarked
                ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-900 dark:border-amber-700 dark:text-amber-300'
                : 'border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-600 dark:border-gray-600 dark:text-gray-400'
            }`}>
            <svg className="w-3 h-3" fill={bookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {bookmarked ? 'Saved' : 'Save'}
          </button>
        </div>
      )}

      {summaryError && (
        <div className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900 dark:text-red-300 rounded-lg px-3 py-2">
          {summaryError}
        </div>
      )}
      {summary && (
        <div className="mt-2 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-xl px-3 sm:px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <svg className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">AI Summary</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{summary}</p>
        </div>
      )}
    </div>
  );
}