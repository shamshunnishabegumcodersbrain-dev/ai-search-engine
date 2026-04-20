export default function ResultCard({ result, searchType }) {
  const { title, url, description, source_site, date, thumbnail } = result;
  const hasValidUrl = url && url.startsWith('http');

  const getFavicon = (siteUrl) => {
    try {
      return `https://www.google.com/s2/favicons?domain=${new URL(siteUrl).origin}&sz=32`;
    } catch {
      return null;
    }
  };

  const getBreadcrumb = (siteUrl) => {
    try {
      const u = new URL(siteUrl);
      const host = u.hostname.replace('www.', '');
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length === 0) return host;
      return [host, ...parts.slice(0, 2)].join(' › ');
    } catch {
      return source_site || siteUrl;
    }
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
    } catch {
      return dateStr;
    }
  };

  // Image result card
  if (searchType === 'images') {
    if (!thumbnail && !url) return null;
    return (
      <div className="inline-block w-40 m-1 align-top">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
          aria-label={`${title} (opens in new tab)`}
        >
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={title}
              className="w-full h-28 object-cover rounded-lg group-hover:opacity-90 transition-opacity"
              onError={(e) => { e.target.style.display = 'none'; }}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-28 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-xs">
              No image
            </div>
          )}
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">{title}</p>
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl px-4 py-3 mb-2 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
      {/* Site info row */}
      <div className="flex items-center gap-2 mb-1">
        {hasValidUrl && (
          <img
            src={getFavicon(url)}
            alt=""
            className="w-4 h-4 rounded-sm flex-shrink-0"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {hasValidUrl ? getBreadcrumb(url) : (source_site || '')}
        </span>
        {date && (
          <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
            {formatDate(date)}
          </span>
        )}
      </div>

      {/* Title */}
      {hasValidUrl ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${title} (opens in new tab)`}
          className="group text-blue-700 dark:text-blue-400 text-lg font-medium hover:underline inline-flex items-start gap-1 mb-1 leading-tight"
        >
          <span>{title}</span>
          {/* External link indicator — visible on hover for accessibility */}
          <svg
            className="w-3.5 h-3.5 flex-shrink-0 mt-1.5 opacity-0 group-hover:opacity-60 transition-opacity"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      ) : (
        <p className="text-gray-800 dark:text-gray-200 text-lg font-medium mb-1 leading-tight">{title}</p>
      )}

      {/* Description */}
      {description && (
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{description}</p>
      )}
    </div>
  );
}