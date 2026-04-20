export default function RelatedSearches({ items, onSearch }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-6 mb-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Related searches</h2>
      <div className="grid grid-cols-2 gap-2">
        {items.map((query, i) => (
          <button
            key={i}
            onClick={() => onSearch(query)}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
          >
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate">{query}</span>
          </button>
        ))}
      </div>
    </div>
  );
}