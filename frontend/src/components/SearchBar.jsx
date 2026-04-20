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
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState(''); // 'recording' | 'transcribing' | ''
  const [voiceLang, setVoiceLang] = useState('en');
  const [showLangPicker, setShowLangPicker] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const langPickerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Close lang picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (langPickerRef.current && !langPickerRef.current.contains(e.target)) {
        setShowLangPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = (q) => {
    const trimmed = (q || query).trim();
    if (!trimmed) return;
    saveRecent(trimmed);
    setShowRecent(false);
    navigate(`/results?q=${encodeURIComponent(trimmed)}`);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  };

  const handleVoiceSearch = async () => {
    // If already recording, stop
    if (isListening) {
      stopRecording();
      return;
    }

    // Check MediaRecorder support
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

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all mic tracks
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
        } finally {
          setVoiceStatus('');
        }
      };

      recorder.start();
      setIsListening(true);
      setVoiceStatus('recording');

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') stopRecording();
      }, 10000);

    } catch (err) {
      console.error('Microphone error:', err);
      alert('Microphone access denied. Please allow microphone permissions and try again.');
      setIsListening(false);
      setVoiceStatus('');
    }
  };

  const micLabel = voiceStatus === 'transcribing'
    ? 'Transcribing...'
    : voiceStatus === 'recording'
    ? 'Listening... tap to stop'
    : isListening ? 'Stop listening' : 'Search by voice';

  return (
    <div className="w-full max-w-2xl mx-auto">
      {showLogo && (
        <h1 className="text-4xl font-bold text-center text-blue-600 mb-8">{APP_NAME}</h1>
      )}

      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowRecent(true)}
              onBlur={() => setTimeout(() => setShowRecent(false), 200)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Search anything..."
              aria-label="Search query"
              className="w-full px-5 py-3 pr-20 rounded-full border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            />

            {/* Language selector button */}
            <div ref={langPickerRef} className="absolute right-10 top-1/2 -translate-y-1/2">
              <button
                onClick={() => setShowLangPicker((v) => !v)}
                title="Voice language"
                className="p-1 text-xs text-gray-400 hover:text-blue-500 font-medium w-6 text-center"
              >
                {voiceLang.toUpperCase()}
              </button>
              {showLangPicker && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-36 overflow-hidden">
                  {VOICE_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setVoiceLang(l.code); setShowLangPicker(false); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${voiceLang === l.code ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Microphone button */}
            <button
              onClick={handleVoiceSearch}
              disabled={voiceStatus === 'transcribing'}
              title={micLabel}
              aria-label={micLabel}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors disabled:opacity-50 ${
                isListening
                  ? 'text-red-500 bg-red-50 animate-pulse'
                  : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
              }`}
            >
              {voiceStatus === 'transcribing' ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                  />
                </svg>
              )}
            </button>
          </div>

          <button
            onClick={() => handleSubmit()}
            className="px-6 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>

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

        {showRecent && !isListening && (
          <div className="absolute top-full left-0 right-0 mt-1 z-10">
            <RecentSearches onSelect={(q) => { setQuery(q); handleSubmit(q); }} />
          </div>
        )}
      </div>

      {showLogo && !showRecent && (
        <div className="mt-4">
          <RecentSearches onSelect={(q) => { setQuery(q); handleSubmit(q); }} />
        </div>
      )}
    </div>
  );
}