import { useState } from "react";

export default function AIAnswer({ answer, source }) {
  const [expanded, setExpanded] = useState(true);

  if (!answer) return null;

  const paragraphs = answer.split("\n").filter((p) => p.trim());

  return (
    <div className="relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 border-2 border-blue-300 dark:border-blue-700 rounded-2xl p-6 mb-8 shadow-md">

      {/* Top badge row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Glowing AI icon */}
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-300 dark:shadow-blue-900">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-blue-800 dark:text-blue-200 font-bold text-base">AI Answer</span>
              {/* "Better than Google" badge */}
              <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full font-semibold shadow-sm">
                ✦ Powered by Llama 3.3 70B
              </span>
            </div>
            <span className="text-xs text-blue-500 dark:text-blue-400">
              {source === "google_search" ? "Summarised from web results" : "From AI knowledge base"}
            </span>
          </div>
        </div>

        {/* Collapse / expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 transition-colors p-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900"
          title={expanded ? "Collapse" : "Expand"}
        >
          <svg className={`w-5 h-5 transition-transform ${expanded ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-blue-200 via-indigo-300 to-purple-200 dark:from-blue-800 dark:via-indigo-700 dark:to-purple-800 mb-4" />

      {/* Answer text — collapsible */}
      {expanded && (
        <div className="space-y-3">
          {paragraphs.map((para, i) => (
            <p
              key={i}
              className="text-gray-800 dark:text-gray-100 leading-relaxed text-[15px]"
            >
              {para}
            </p>
          ))}
        </div>
      )}

      {/* Bottom note */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
          </svg>
          <span className="text-xs text-blue-400 dark:text-blue-500">
            AI answers may not be 100% accurate — always verify with sources below.
          </span>
        </div>
      )}
    </div>
  );
}