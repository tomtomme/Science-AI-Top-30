import React from 'react';
import { Search, X } from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  matchCount?: number;
  totalCount?: number;
  lang: Language;
}

const POPULAR_FAMILIES = [
  'Claude',
  'Gemini',
  'ChatGPT',
  'DeepSeek',
  'Qwen',
  'GLM',
  'Grok',
  'Muse',
  'Mistral',
];

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  matchCount,
  totalCount,
  lang,
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 sm:px-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      {/* Search Input */}
      <div className="relative flex-1 flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 transition-colors"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2.5 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            title={t.reset}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Quick family chips & match indicator */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
          {t.quickFilters}
        </span>
        {POPULAR_FAMILIES.map((family) => {
          const isActive = value.toLowerCase().trim() === family.toLowerCase();
          return (
            <button
              key={family}
              type="button"
              onClick={() => onChange(isActive ? '' : family)}
              className={`text-[11px] px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {family}
            </button>
          );
        })}

        {value.trim() && matchCount !== undefined && totalCount !== undefined && (
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold ml-1">
            ({matchCount}/{totalCount} {t.highlighted})
          </span>
        )}
      </div>
    </div>
  );
};
