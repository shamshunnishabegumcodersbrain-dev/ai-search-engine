import { useState } from 'react';

function AskItem({ item }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-3 px-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-800 text-sm font-medium pr-4">{item.question}</span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {item.answer && (
            <p className="text-sm text-gray-700 leading-relaxed mb-2">{item.answer}</p>
          )}
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              {item.source_title || item.source_url}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function PeopleAlsoAsk({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-4 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">People also ask</h2>
      </div>
      {items.map((item, i) => (
        <AskItem key={i} item={item} />
      ))}
    </div>
  );
}