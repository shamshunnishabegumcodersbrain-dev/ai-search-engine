import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import AIAnswer from '../components/AIAnswer';
import ResultsList from '../components/ResultsList';
import Pagination from '../components/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import PeopleAlsoAsk from '../components/PeopleAlsoAsk';
import RelatedSearches from '../components/RelatedSearches';
import KnowledgePanel from '../components/KnowledgePanel';
import SpellingBanner from '../components/SpellingBanner';
import { searchQuery } from '../utils/api';

const SEARCH_TABS = [
  { id: 'web', label: 'All' },
  { id: 'news', label: 'News' },
  { id: 'images', label: 'Images' },
];

export default function Results() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page')) || 1;
  const searchType = searchParams.get('type') || 'web';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showMobileKP, setShowMobileKP] = useState(false);

  const abortRef = useRef(null);

  useEffect(() => {
    if (!query) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchResults = async () => {
      setData(null);
      setLoading(true);
      setError(null);
      setShowMobileKP(false);
      try {
        const result = await searchQuery(query, page, 10, searchType, controller.signal);
        setData(result);
      } catch (err) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        setError(err.response?.data?.error || 'Search failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
    return () => controller.abort();
  }, [query, page, searchType]);

  const handlePageChange = (newPage) => {
    setSearchParams({ q: query, page: newPage, type: searchType });
    window.scrollTo(0, 0);
  };

  const handleTabChange = (tabId) => {
    setSearchParams({ q: query, page: 1, type: tabId });
  };

  const handleSpellFixClick = (corrected) => {
    setSearchParams({ q: corrected, page: 1, type: searchType });
  };

  const handleRelatedSearch = (relatedQuery) => {
    setSearchParams({ q: relatedQuery, page: 1, type: searchType });
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Search: ${query}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User cancelled share or clipboard failed
    }
  };

  const hasKnowledgePanel = Boolean(data?.knowledge_panel?.title);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <button
              onClick={() => navigate('/')}
              className="text-blue-600 font-bold text-xl flex-shrink-0 hover:opacity-80 transition-opacity"
              aria-label="Go to homepage"
            >
              AI
            </button>

            <div className="flex-1 min-w-0">
              <SearchBar initialQuery={query} showLogo={false} />
            </div>

            {/* Share button */}
            <button
              onClick={handleShare}
              title={copied ? 'Link copied!' : 'Share this search'}
              className="flex-shrink-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              aria-label="Share this search"
            >
              {copied ? (
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              )}
            </button>
          </div>

          {/* Search type tabs */}
          <div className="flex gap-1 mt-3 border-b border-gray-200 dark:border-gray-700">
            {SEARCH_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  searchType === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}

            {/* Mobile Knowledge Panel toggle — only show when KP exists */}
            {hasKnowledgePanel && (
              <button
                onClick={() => setShowMobileKP((v) => !v)}
                className="ml-auto px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border-b-2 border-transparent hover:border-blue-300 transition-colors lg:hidden"
              >
                {showMobileKP ? 'Hide info' : 'About'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results area */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        {loading && <LoadingSpinner />}
        {error && <ErrorMessage message={error} />}

        {!loading && data && (
          <div className={`flex gap-6 ${hasKnowledgePanel ? 'flex-row' : ''}`}>

            {/* Main column */}
            <div className="flex-1 min-w-0">

              {/* Result count + time */}
              {data.formatted_result_count && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {data.formatted_result_count}
                  {data.from_cache && (
                    <span className="ml-2 text-xs text-green-600 bg-green-50 dark:bg-green-900 dark:text-green-400 px-2 py-0.5 rounded-full">
                      cached
                    </span>
                  )}
                </p>
              )}

              {/* Mobile Knowledge Panel (inline) */}
              {hasKnowledgePanel && showMobileKP && (
                <div className="lg:hidden mb-4">
                  <KnowledgePanel panel={data.knowledge_panel} />
                </div>
              )}

              {/* Spelling correction */}
              {data.spell_fix && (
                <SpellingBanner
                  original={query}
                  corrected={data.spell_fix}
                  onClick={handleSpellFixClick}
                />
              )}

              {/* AI Overview */}
              <AIAnswer answer={data.ai_answer} source={data.source} />

              {/* People also ask */}
              {Array.isArray(data.people_also_ask) && data.people_also_ask.length > 0 && (
                <PeopleAlsoAsk items={data.people_also_ask} />
              )}

              {/* Results */}
              {data.total_results === 0 && (!data.results || data.results.length === 0) ? (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center text-gray-500 dark:text-gray-400">
                  <p className="font-medium mb-1">No results found for "{query}"</p>
                  <p className="text-sm">
                    Try different keywords, or check the AI answer above for general information.
                  </p>
                </div>
              ) : (
                <>
                  <ResultsList results={data.results} searchType={searchType} />
                  <Pagination
                    page={data.page}
                    totalPages={data.total_pages}
                    onPageChange={handlePageChange}
                  />
                </>
              )}

              {/* Related searches */}
              {Array.isArray(data.related_searches) && data.related_searches.length > 0 && (
                <RelatedSearches
                  items={data.related_searches}
                  onSearch={handleRelatedSearch}
                />
              )}
            </div>

            {/* Knowledge panel sidebar — desktop only */}
            {hasKnowledgePanel && (
              <div className="w-80 flex-shrink-0 hidden lg:block">
                <KnowledgePanel panel={data.knowledge_panel} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}