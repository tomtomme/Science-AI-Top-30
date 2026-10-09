import React from 'react';
import { BENCHMARK_COMPONENTS } from '../data/benchmarks';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface BenchmarkLegendProps {
  activeBenchmarkId: string | null;
  onSelectBenchmark: (id: string | null) => void;
  lang: Language;
  className?: string;
}

export const BenchmarkLegend: React.FC<BenchmarkLegendProps> = ({
  activeBenchmarkId,
  onSelectBenchmark,
  lang,
  className = '',
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-4.5 shadow-2xs flex flex-col justify-between text-xs ${className}`}
    >
      {/* 1. OBEN: Unexplodierte Balkenfarben (Länder / Flaggen) */}
      <div className="pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold select-none mb-2.5">
          {t.unexplodedTitle}
        </div>
        <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
          {/* USA */}
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-4 rounded-xs bg-[#1E3A8A] border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-white shrink-0 shadow-2xs font-bold">
              ★
            </span>
            <span className="font-medium whitespace-nowrap">{t.usaLabel}</span>
          </div>

          {/* China */}
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-4 rounded-xs bg-[#DC2626] border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-[#FACC15] shrink-0 font-bold shadow-2xs">
              ★
            </span>
            <span className="font-medium whitespace-nowrap">{t.chinaLabel}</span>
          </div>

          {/* Europa / Frankreich (Tricolore) */}
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-4 rounded-xs flex overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 shadow-2xs">
              <span className="w-1/3 h-full bg-[#002654]" />
              <span className="w-1/3 h-full bg-white" />
              <span className="w-1/3 h-full bg-[#ED2939]" />
            </span>
            <span className="font-medium whitespace-nowrap">{t.europeLabel}</span>
          </div>
        </div>
      </div>

      {/* 2. UNTEN: Explodierte Balkenfarben (die 8 Benchmark-Kriterien) */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold select-none">
            {t.legendTitle}
          </span>
          {activeBenchmarkId && (
            <button
              type="button"
              onClick={() => onSelectBenchmark(null)}
              className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer font-medium"
            >
              {t.all}
            </button>
          )}
        </div>

        {/* Vertical list of the 8 benchmark criteria with ample width and no truncation */}
        <div className="space-y-1">
          {BENCHMARK_COMPONENTS.map((bench) => {
            const isSelected = activeBenchmarkId === bench.id;
            const isFaded = activeBenchmarkId !== null && !isSelected;
            const name = lang === 'en' ? bench.nameEn : bench.nameDe;

            return (
              <button
                key={bench.id}
                type="button"
                onClick={() => onSelectBenchmark(isSelected ? null : bench.id)}
                className={`w-full flex items-center px-2 py-1.5 rounded-lg transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold ring-1 ring-slate-400'
                    : isFaded
                    ? 'opacity-35 hover:opacity-75 text-slate-500'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
                title={`${name} · Formel: ${bench.formulaDesc}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-xs shrink-0 shadow-2xs border border-black/10 dark:border-white/10"
                    style={{ backgroundColor: bench.color }}
                  />
                  <span className="text-xs leading-snug whitespace-nowrap overflow-hidden text-ellipsis font-medium">
                    {name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
