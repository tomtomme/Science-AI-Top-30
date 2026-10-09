/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ModelRecord } from './types';
import { FALLBACK_CSV_CONTENT, SHEET_HTML_URL, PIVOT_HTML_URL, CHART_HTML_URL, RAW_CSV_URL, GITHUB_REPO_URL } from './data/rawCsvFallback';
import { parseModelDataset } from './utils/csvParser';
import { loadModelsData } from './services/dataService';
import { ExplodedBarChart } from './components/ExplodedBarChart';
import { BenchmarkLegend } from './components/BenchmarkLegend';
import { SearchBar } from './components/SearchBar';
import { Language, TRANSLATIONS } from './utils/i18n';
import { RefreshCw, Github, FileSpreadsheet, Globe } from 'lucide-react';

export default function App() {
  // Language state (de | en)
  const [lang, setLang] = useState<Language>('de');
  const t = TRANSLATIONS[lang];

  // Pre-load top 30 models from embedded fallback for instant zero-latency render
  const initialModels = useMemo(() => parseModelDataset(FALLBACK_CSV_CONTENT), []);
  const [models, setModels] = useState<ModelRecord[]>(initialModels);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  
  // Toggle 1: Enable/disable exploded view interaction
  const [explodedViewEnabled, setExplodedViewEnabled] = useState<boolean>(true);
  
  // Toggle 2: "Volle Explosion" -> all bars fully exploded simultaneously
  const [fullExplosionEnabled, setFullExplosionEnabled] = useState<boolean>(false);

  // Search/family filter for highlighting models
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedCompany] = useState<string | null>(null);

  // Active benchmark filter from legend
  const [activeBenchmarkId, setActiveBenchmarkId] = useState<string | null>(null);

  // Hourly countdown timer (3600 seconds)
  const SYNC_INTERVAL = 3600;
  const [, setCountdown] = useState<number>(SYNC_INTERVAL);

  const refreshData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await loadModelsData();
      if (result.models && result.models.length > 0) {
        setModels(result.models);
      }
      setLastSyncedAt(new Date());
      setCountdown(SYNC_INTERVAL);
    } catch (e) {
      console.warn('Sync notice:', e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Sync on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Hourly timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refreshData();
          return SYNC_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [refreshData]);

  const formatTime = (d: Date | null) => {
    if (!d) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Match count for search filter
  const highlightedCount = useMemo(() => {
    if (!searchFilter.trim() && !selectedCompany) return models.length;
    const q = searchFilter.trim().toLowerCase();
    return models.filter((m) => {
      const matchesSearch =
        !q ||
        m.displayName.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.companyName.toLowerCase().includes(q) ||
        m.creatorClean.toLowerCase().includes(q);

      const matchesCompany =
        !selectedCompany ||
        m.companyName.toLowerCase() === selectedCompany.toLowerCase() ||
        m.creatorClean.toLowerCase().includes(selectedCompany.toLowerCase());

      return matchesSearch && matchesCompany;
    }).length;
  }, [models, searchFilter, selectedCompany]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans antialiased">
      {/* Clean top bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs px-4 sm:px-6 py-2.5">
        <div className="w-full max-w-[1720px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Title & Subtitle */}
          <div className="max-w-4xl">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
              {t.title}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal font-sans">
              {t.subtitle}
            </p>
          </div>

          {/* Controls, language toggle & sync actions */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono shrink-0">
            {/* Language Switcher DE / EN */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setLang('de')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                  lang === 'de'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Auf Deutsch umschalten"
              >
                DE
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                  lang === 'en'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Switch to English"
              >
                EN
              </button>
            </div>

            {/* Toggle 1: Explosion ON / OFF */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2 py-1">
              <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                {t.explosionToggle}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={explodedViewEnabled}
                onClick={() => {
                  setExplodedViewEnabled((prev) => !prev);
                }}
                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  explodedViewEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
                title={explodedViewEnabled ? 'Mouse-Over Explosion deaktivieren' : 'Mouse-Over Explosion aktivieren'}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    explodedViewEnabled ? 'translate-x-3' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {explodedViewEnabled ? t.on : t.off}
              </span>
            </div>

            {/* Toggle 2: Volle Explosion ON / OFF */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2 py-1">
              <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                {t.fullExplosionToggle}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={fullExplosionEnabled}
                onClick={() => {
                  setFullExplosionEnabled((prev) => !prev);
                }}
                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  fullExplosionEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
                title={fullExplosionEnabled ? 'Volle Explosion deaktivieren' : 'Alle 30 Balken gleichzeitig vollständig explodieren'}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    fullExplosionEnabled ? 'translate-x-3' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {fullExplosionEnabled ? t.on : t.off}
              </span>
            </div>

            <span className="hidden xl:inline text-slate-500 dark:text-slate-400 text-[11px]">
              {t.lastSync} {formatTime(lastSyncedAt)}
            </span>

            <button
              onClick={refreshData}
              disabled={isSyncing}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              title="Google Sheets CSV synchronisieren"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
              <span>{t.sync}</span>
            </button>

            <a
              href={SHEET_HTML_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              title="Google Sheet öffnen"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </a>

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              title="GitHub Repository tomtomme/AI-Top30"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Bar Chart Container with Legend on the Left */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex flex-col space-y-2.5">
        {/* Search Bar oberhalb des Balkendiagramms mit Muse und ChatGPT */}
        <SearchBar
          value={searchFilter}
          onChange={setSearchFilter}
          matchCount={highlightedCount}
          totalCount={models.length}
          lang={lang}
        />

        {/* Layout: Links = Explosionsfarben-Legende, Rechts = Balkendiagramm */}
        <div className="flex flex-col lg:flex-row items-stretch gap-3">
          {/* Legende: Unexplodierte Balkenfarben OBEN, Explodierte Farben UNTEN */}
          <BenchmarkLegend
            activeBenchmarkId={activeBenchmarkId}
            onSelectBenchmark={setActiveBenchmarkId}
            lang={lang}
            className="w-full lg:w-72 xl:w-80 shrink-0"
          />

          {/* Balkendiagramm: Breit dargestellt, responsiv ohne horizontales Scrollen */}
          <div className="flex-1 min-w-0">
            <ExplodedBarChart
              models={models}
              activeBenchmarkId={activeBenchmarkId}
              explodedViewEnabled={explodedViewEnabled}
              fullExplosionEnabled={fullExplosionEnabled}
              searchFilter={searchFilter}
              selectedCompany={selectedCompany}
              lang={lang}
            />
          </div>
        </div>
      </main>

      {/* Clean quiet footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-2.5 px-4 text-center text-[11px] text-slate-400 font-mono">
        <div className="w-full max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>AI-Top30 · Deployment auf GitHub Pages (tomtomme/AI-Top30)</span>
          <div className="flex items-center gap-3">
            <a href={RAW_CSV_URL} target="_blank" rel="noopener noreferrer" className="hover:underline">
              Freigegebenes CSV
            </a>
            <span>·</span>
            <a href={CHART_HTML_URL} target="_blank" rel="noopener noreferrer" className="hover:underline">
              Original-Diagramm (Datei 1)
            </a>
            <span>·</span>
            <a href={PIVOT_HTML_URL} target="_blank" rel="noopener noreferrer" className="hover:underline">
              Pivot (Datei 3)
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
