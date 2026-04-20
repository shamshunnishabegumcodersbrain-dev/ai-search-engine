export default function SourceBadge({ source }) {
  const isScraped = source === 'scraped_data';
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
      isScraped
        ? 'bg-green-100 text-green-700'
        : 'bg-blue-100 text-blue-700'
    }`}>
      {isScraped ? 'From indexed sites' : 'AI Knowledge'}
    </span>
  );
}