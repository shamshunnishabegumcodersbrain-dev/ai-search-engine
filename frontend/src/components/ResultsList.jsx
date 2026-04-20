import ResultCard from './ResultCard';

export default function ResultsList({ results, searchType = 'web' }) {
  if (!results || results.length === 0) {
    const msg = searchType === 'images'
      ? 'No images found. Try a different search term.'
      : 'No results found. Try a different search.';
    return (
      <div className="text-center py-10 text-gray-400 dark:text-gray-500">
        {msg}
      </div>
    );
  }

  if (searchType === 'images') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 mb-2">
        <div className="flex flex-wrap">
          {results.map((result, index) => (
            <ResultCard key={index} result={result} searchType={searchType} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {results.map((result, index) => (
        <ResultCard key={index} result={result} searchType={searchType} />
      ))}
    </div>
  );
}