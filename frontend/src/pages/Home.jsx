import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import Logo from '../components/Logo';

const TOPICS = [
  'AI News', 'India News', 'Smartphones', 'Stock Market',
  'Health Tips', 'Cricket', 'Movies', 'Technology'
];

function SettingsModal({ onClose }) {
  const [lang, setLang] = useState(() => localStorage.getItem('preferred_voice_lang') || 'en');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');

  const save = () => {
    localStorage.setItem('preferred_voice_lang', lang);
    localStorage.setItem('theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else if (theme === 'light') document.documentElement.classList.remove('dark');
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl p-6 w-full sm:max-w-sm">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Settings</h2>
        <div className="mb-4">
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Default voice language</label>
          <select value={lang} onChange={(e) => setLang(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-base dark:bg-gray-700 dark:text-gray-100">
            {[{code:'en',label:'English'},{code:'hi',label:'Hindi'},{code:'te',label:'Telugu'},
              {code:'ta',label:'Tamil'},{code:'mr',label:'Marathi'},{code:'bn',label:'Bengali'}]
              .map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <div className="mb-6">
          <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Theme</label>
          <div className="flex gap-2">
            {['system','light','dark'].map((t) => (
              <button key={t} onClick={() => setTheme(t)}
                className={`flex-1 py-2.5 text-sm rounded-lg border transition-colors capitalize ${
                  theme===t ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:underline">Cancel</button>
          <button onClick={save} className="px-5 py-2.5 bg-blue-600 text-white text-sm rounded-full hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  );
}

function AboutModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl p-6 w-full sm:max-w-sm">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">About AI Search</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          AI Search combines Google Search results with Groq's Llama 3 AI to give you fast, intelligent answers.
          Voice search supports multiple Indian languages via Groq Whisper.
        </p>

        <button onClick={onClose} className="w-full py-3 bg-blue-600 text-white text-sm rounded-full hover:bg-blue-700">Close</button>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout]       = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      <nav className="flex justify-end items-center px-4 sm:px-6 py-3 gap-4">
        <button onClick={() => setShowAbout(true)} className="text-sm text-gray-600 dark:text-gray-300 hover:underline py-1">About</button>
        <button onClick={() => setShowSettings(true)} className="text-sm text-gray-600 dark:text-gray-300 hover:underline py-1">Settings</button>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-6 sm:-mt-10">
        <div className="mb-8 sm:mb-10"><Logo size="lg" /></div>
        <div className="w-full max-w-2xl"><SearchBar showLogo={false} /></div>
        <div className="mt-6 sm:mt-8 flex flex-wrap gap-2 justify-center max-w-2xl w-full">
          {TOPICS.map((topic) => (
            <button key={topic} onClick={() => navigate(`/results?q=${encodeURIComponent(topic)}`)}
              className="px-3 sm:px-4 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 active:bg-gray-300 transition-colors">
              {topic}
            </button>
          ))}
        </div>
      </div>

      <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 safe-bottom">
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>India</span>
          <div className="flex gap-4 sm:gap-6">
            <button onClick={() => setShowSettings(true)} className="hover:underline">Privacy</button>
            <button onClick={() => setShowAbout(true)} className="hover:underline">Terms</button>
          </div>
        </div>
      </footer>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showAbout    && <AboutModal    onClose={() => setShowAbout(false)} />}
    </div>
  );
}