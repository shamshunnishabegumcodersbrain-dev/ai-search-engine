export default function SpellingBanner({ original, corrected, onClick }) {
  if (!corrected || corrected.toLowerCase() === original.toLowerCase()) return null;

  return (
    <div className="mb-4 text-sm text-gray-600">
      Did you mean:{' '}
      <button
        onClick={() => onClick(corrected)}
        className="text-blue-700 hover:underline font-medium italic"
      >
        {corrected}
      </button>
      {' '}?
    </div>
  );
}