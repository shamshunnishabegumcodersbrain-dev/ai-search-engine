export default function KnowledgePanel({ panel }) {
  if (!panel || !panel.title) return null;

  const { title, type, description, image, website, facts } = panel;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden sticky top-4">
      {/* Header image */}
      {image && (
        <img
          src={image}
          alt={title}
          className="w-full h-40 object-cover"
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}

      <div className="p-4">
        {/* Title + type */}
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {type && (
          <p className="text-sm text-gray-500 mb-2">{type}</p>
        )}

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-700 leading-relaxed mb-3 border-b border-gray-100 pb-3">
            {description}
          </p>
        )}

        {/* Key facts */}
        {facts && Object.keys(facts).length > 0 && (
          <dl className="space-y-2">
            {Object.entries(facts).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <dt className="text-sm text-gray-500 min-w-24 capitalize">
                  {key.replace(/_/g, ' ')}
                </dt>
                <dd className="text-sm text-gray-800 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        {/* Website link */}
        {website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block text-sm text-blue-600 hover:underline"
          >
            {website.replace(/^https?:\/\//, '')}
          </a>
        )}
      </div>
    </div>
  );
}