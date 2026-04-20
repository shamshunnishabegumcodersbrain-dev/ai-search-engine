import { getRecent, clearRecent } from '../utils/searchHistory';

export default function RecentSearches({ onSelect }) {
  const recent = getRecent();
  if (recent.length === 0) return null;
  return (
    <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10 w-full">
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
        <span className="text-xs text-gray-400 font-medium">Recent searches</span>
        <button onClick={clearRecent} className="text-xs text-red-400 hover:text-red-600">Clear</button>
      </div>
      {recent.map((q, i) => (
        <div key={i} onClick={() => onSelect(q)}
          className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 flex items-center gap-2">
          <span className="text-gray-400">&#x1F550;</span> {q}
        </div>
      ))}
    </div>
  );
}