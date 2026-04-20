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
import Logo from '../components/Logo';
import { searchQuery } from '../utils/api';

const SEARCH_TABS = [
  { id: 'web',    label: 'All' },
  { id: 'news',   label: 'News' },
  { id: 'images', label: 'Images' },
  { id: 'videos', label: 'Videos' },
];

const TIME_FILTERS = [
  { id: '',       label: 'Any time' },
  { id: 'qdr:h',  label: 'Past hour' },
  { id: 'qdr:d',  label: 'Past 24 hours' },
  { id: 'qdr:w',  label: 'Past week' },
  { id: 'qdr:m',  label: 'Past month' },
  { id: 'qdr:y',  label: 'Past year' },
];

export default function Results() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate   = useNavigate();
  const query      = searchParams.get('q')    || '';
  const page       = parseInt(searchParams.get('page')) || 1;
  const searchType = searchParams.get('type') || 'web';
  const timeFilter = searchParams.get('tbs')  || '';

  const [data, setData]                 = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [copied, setCopied]             = useState(false);
  const [showMobileKP, setShowMobileKP] = useState(false);
  const [showTimeMenu, setShowTimeMenu] = useState(false);

  const abortRef    = useRef(null);
  const timeMenuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (timeMenuRef.current && !timeMenuRef.current.contains(e.target))
        setShowTimeMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchResults = async () => {
      setData(null); setLoading(true); setError(null); setShowMobileKP(false);
      try {
        const result = await searchQuery(query, page, 10, searchType, controller.signal, timeFilter);
        setData(result);
      } catch (err) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        setError(err.response?.data?.error || 'Search failed. Please try again.');
      } finally { setLoading(false); }
    };
    fetchResults();
    return () => controller.abort();
  }, [query, page, searchType, timeFilter]);

  const handlePageChange    = (newPage)   => { setSearchParams({ q: query, page: newPage, type: searchType, ...(timeFilter && { tbs: timeFilter }) }); window.scrollTo(0, 0); };
  const handleTabChange     = (tabId)     => setSearchParams({ q: query, page: 1, type: tabId });
  const handleSpellFixClick = (corrected) => setSearchParams({ q: corrected, page: 1, type: searchType });
  const handleRelatedSearch = (rq)        => setSearchParams({ q: rq, page: 1, type: searchType });

  const handleTimeFilter = (tbs) => {
    setShowTimeMenu(false);
    const params = { q: query, page: 1, type: searchType };
    if (tbs) params.tbs = tbs;
    setSearchParams(params);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: `Search: ${query}`, url }); }
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* cancelled */ }
  };

  const hasKnowledgePanel = Boolean(data?.knowledge_panel?.title);
  const activeTimeLabel   = TIME_FILTERS.find((f) => f.id === timeFilter)?.label || 'Any time';
  const timeFilterActive  = !!timeFilter;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-2 sm:px-4 py-2 sm:py-3">
        <div className="max-w-5xl mx-auto">

          {/* Top row: logo + searchbar + share */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => navigate('/')}
              className="flex-shrink-0 hover:opacity-80 transition-opacity"
              aria-label="Go to homepage">
              <Logo size="sm" />
            </button>

            <div className="flex-1 min-w-0">
              <SearchBar initialQuery={query} showLogo={false} />
            </div>

            <button onClick={handleShare}
              title={copied ? 'Copied!' : 'Share'}
              className="flex-shrink-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              aria-label="Share this search">
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

          {/* ── Tabs row — horizontally scrollable on mobile ── */}
          <div className="flex items-end mt-2 sm:mt-3 border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-none">
            <div className="flex items-end gap-0 sm:gap-1 flex-shrink-0">
              {SEARCH_TABS.map((tab) => (
                <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                  className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                    searchType === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}>
                  {tab.label}
                </button>
              ))}

              {/* Time filter */}
              {['web','news','videos'].includes(searchType) && (
                <div ref={timeMenuRef} className="relative ml-1 mb-0.5 flex-shrink-0">
                  <button onClick={() => setShowTimeMenu((v) => !v)}
                    className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs rounded-full border transition-colors whitespace-nowrap ${
                      timeFilterActive
                        ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-300'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:text-gray-400'
                    }`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {/* Hide label text on very small screens */}
                    <span className="hidden xs:inline sm:inline">{activeTimeLabel}</span>
                    <svg className={`w-3 h-3 transition-transform ${showTimeMenu ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showTimeMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-30 w-40 overflow-hidden">
                      {TIME_FILTERS.map((f) => (
                        <button key={f.id} onClick={() => handleTimeFilter(f.id)}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                            timeFilter === f.id
                              ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900 dark:text-blue-300'
                              : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                          }`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {hasKnowledgePanel && (
              <button onClick={() => setShowMobileKP((v) => !v)}
                className="ml-auto flex-shrink-0 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border-b-2 border-transparent hover:border-blue-300 transition-colors lg:hidden whitespace-nowrap">
                {showMobileKP ? 'Hide' : 'About'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results area */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {loading && <LoadingSpinner />}
        {error   && <ErrorMessage message={error} />}

        {!loading && data && (
          <div className={`flex gap-6 ${hasKnowledgePanel ? 'flex-row' : ''}`}>
            <div className="flex-1 min-w-0">

              {data.formatted_result_count && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  {data.formatted_result_count}
                  {timeFilterActive && (
                    <span className="ml-2 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-400 px-2 py-0.5 rounded-full">
                      {activeTimeLabel}
                    </span>
                  )}
                  {data.from_cache && (
                    <span className="ml-2 text-xs text-green-600 bg-green-50 dark:bg-green-900 dark:text-green-400 px-2 py-0.5 rounded-full">cached</span>
                  )}
                </p>
              )}

              {hasKnowledgePanel && showMobileKP && (
                <div className="lg:hidden mb-4"><KnowledgePanel panel={data.knowledge_panel} /></div>
              )}

              {data.spell_fix && (
                <SpellingBanner original={query} corrected={data.spell_fix} onClick={handleSpellFixClick} />
              )}

              <AIAnswer answer={data.ai_answer} source={data.source} />

              {Array.isArray(data.people_also_ask) && data.people_also_ask.length > 0 && (
                <PeopleAlsoAsk items={data.people_also_ask} />
              )}

              {data.total_results === 0 && (!data.results || data.results.length === 0) ? (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center text-gray-500 dark:text-gray-400">
                  <p className="font-medium mb-1">No results found for "{query}"</p>
                  <p className="text-sm">Try different keywords, or check the AI answer above.</p>
                </div>
              ) : (
                <>
                  <ResultsList results={data.results} searchType={searchType} />
                  <Pagination page={data.page} totalPages={data.total_pages} onPageChange={handlePageChange} />
                </>
              )}

              {Array.isArray(data.related_searches) && data.related_searches.length > 0 && (
                <RelatedSearches items={data.related_searches} onSearch={handleRelatedSearch} />
              )}
            </div>

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