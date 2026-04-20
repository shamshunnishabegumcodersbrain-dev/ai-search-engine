import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveRecent } from '../utils/searchHistory';
import RecentSearches from './RecentSearches';
import { APP_NAME } from '../utils/constants';
import { transcribeVoice } from '../utils/api';

const VOICE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'te', label: 'Telugu' },
  { code: 'ta', label: 'Tamil' },
  { code: 'mr', label: 'Marathi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'kn', label: 'Kannada' },
];

export default function SearchBar({ initialQuery = '', showLogo = true }) {
  const [query, setQuery] = useState(initialQuery);
  const [showRecent, setShowRecent] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [voiceLang, setVoiceLang] = useState('en');
  const [showLangPicker, setShowLangPicker] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const langPickerRef    = useRef(null);
  const suggestTimer     = useRef(null);
  const navigate         = useNavigate();

  useEffect(() => { setQuery(initialQuery); }, [initialQuery]);

  useEffect(() => {
    const handler = (e) => {
      if (langPickerRef.current && !langPickerRef.current.contains(e.target))
        setShowLangPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Live suggestions
  useEffect(() => {
    clearTimeout(suggestTimer.current);
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query.trim())}`
        );
        const json = await res.json();
        const items = (json[1] || []).slice(0, 8);
        setSuggestions(items);
        setShowSuggestions(items.length > 0);
        setActiveSuggestion(-1);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 220);
    return () => clearTimeout(suggestTimer.current);
  }, [query]);

  const handleSubmit = (q) => {
    const trimmed = (q ?? query).trim();
    if (!trimmed) return;
    saveRecent(trimmed);
    setShowRecent(false);
    setShowSuggestions(false);
    setSuggestions([]);
    navigate(`/results?q=${encodeURIComponent(trimmed)}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (activeSuggestion >= 0 && suggestions[activeSuggestion]) {
        handleSubmit(suggestions[activeSuggestion]);
      } else {
        handleSubmit();
      }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveSuggestion((v) => Math.min(v + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveSuggestion((v) => Math.max(v - 1, -1)); }
    if (e.key === 'Escape')    { setShowSuggestions(false); setShowRecent(false); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive')
      mediaRecorderRef.current.stop();
    setIsListening(false);
  };

  const handleVoiceSearch = async () => {
    if (isListening) { stopRecording(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      alert('Voice recording is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const audioFormat = mimeType.includes('webm') ? 'webm' : 'ogg';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setVoiceStatus('transcribing');
        try {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          const arrayBuffer = await blob.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          let binary = '';
          uint8.forEach((b) => (binary += String.fromCharCode(b)));
          const base64Audio = btoa(binary);
          const result = await transcribeVoice(base64Audio, voiceLang, audioFormat);
          if (result.success && result.transcript) {
            setQuery(result.transcript);
            handleSubmit(result.transcript);
          } else {
            alert('Could not understand audio. Please try again.');
          }
        } catch (err) {
          console.error('Transcription failed:', err);
          alert('Voice transcription failed. Please try again or type your query.');
        } finally { setVoiceStatus(''); }
      };
      recorder.start();
      setIsListening(true);
      setVoiceStatus('recording');
      setTimeout(() => { if (recorder.state === 'recording') stopRecording(); }, 10000);
    } catch (err) {
      console.error('Microphone error:', err);
      alert('Microphone access denied. Please allow microphone permissions and try again.');
      setIsListening(false);
      setVoiceStatus('');
    }
  };

  const micLabel = voiceStatus === 'transcribing' ? 'Transcribing...'
    : voiceStatus === 'recording' ? 'Listening... tap to stop'
    : isListening ? 'Stop listening' : 'Search by voice';

  const showDropdown = !isListening && (
    (showSuggestions && suggestions.length > 0) ||
    (showRecent && !query.trim())
  );

  return (
    // ── Mobile: full width, no side margins ──────────────────────────────
    <div className="w-full max-w-2xl mx-auto px-0 sm:px-0">
      {showLogo && (
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-blue-600 mb-6 sm:mb-8">
          {APP_NAME}
        </h1>
      )}

      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative min-w-0">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value.trim()) { setShowRecent(true); setShowSuggestions(false); }
                else { setShowRecent(false); }
              }}
              onFocus={() => { if (!query.trim()) setShowRecent(true); }}
              onBlur={() => setTimeout(() => { setShowRecent(false); setShowSuggestions(false); }, 200)}
              onKeyDown={handleKeyDown}
              placeholder="Search anything..."
              aria-label="Search query"
              aria-autocomplete="list"
              // ── Mobile: 16px prevents iOS zoom, larger touch target ──
              className="w-full px-4 sm:px-5 py-3 pr-20 rounded-full border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 text-base dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            />

            {/* Language selector */}
            <div ref={langPickerRef} className="absolute right-10 top-1/2 -translate-y-1/2">
              <button onClick={() => setShowLangPicker((v) => !v)} title="Voice language"
                // ── Mobile: bigger tap area ──
                className="p-1.5 text-xs text-gray-400 hover:text-blue-500 font-medium w-7 text-center">
                {voiceLang.toUpperCase()}
              </button>
              {showLangPicker && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-36 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
                  {VOICE_LANGUAGES.map((l) => (
                    <button key={l.code}
                      onClick={() => { setVoiceLang(l.code); setShowLangPicker(false); }}
                      // ── Mobile: taller rows for easier tapping ──
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        voiceLang === l.code ? 'text-blue-600 font-medium' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Microphone button */}
            <button onClick={handleVoiceSearch} disabled={voiceStatus === 'transcribing'}
              title={micLabel} aria-label={micLabel}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors disabled:opacity-50 ${
                isListening ? 'text-red-500 bg-red-50 animate-pulse' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
              }`}>
              {voiceStatus === 'transcribing' ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
          </div>

          {/* Search button — shorter label on mobile */}
          <button onClick={() => handleSubmit()}
            className="px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors flex-shrink-0 text-sm sm:text-base">
            <span className="hidden sm:inline">Search</span>
            {/* Mobile: show search icon instead of text to save space */}
            <svg className="w-5 h-5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {/* Voice status banners */}
        {voiceStatus === 'recording' && (
          <div className="absolute top-full left-0 right-0 mt-2 text-center text-sm text-red-500 font-medium animate-pulse">
            Listening in {VOICE_LANGUAGES.find((l) => l.code === voiceLang)?.label || voiceLang}… tap mic to stop
          </div>
        )}
        {voiceStatus === 'transcribing' && (
          <div className="absolute top-full left-0 right-0 mt-2 text-center text-sm text-blue-500 font-medium">
            Transcribing audio…
          </div>
        )}

        {/* Suggestions dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-14 sm:right-16 mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden">
            {showSuggestions && suggestions.length > 0 ? (
              <ul role="listbox">
                {suggestions.map((s, i) => (
                  <li key={s} role="option" aria-selected={i === activeSuggestion}>
                    <button
                      onMouseDown={() => handleSubmit(s)}
                      onMouseEnter={() => setActiveSuggestion(i)}
                      // ── Mobile: taller rows for easier tapping ──
                      className={`w-full text-left flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                        i === activeSuggestion
                          ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}>
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>{s}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <RecentSearches onSelect={(q) => { setQuery(q); handleSubmit(q); }} />
            )}
          </div>
        )}
      </div>

      {showLogo && !showDropdown && (
        <div className="mt-4">
          <RecentSearches onSelect={(q) => { setQuery(q); handleSubmit(q); }} />
        </div>
      )}
    </div>
  );
}