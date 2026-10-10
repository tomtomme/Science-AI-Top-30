/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ModelRecord } from './types';
import { FALLBACK_CSV_CONTENT, SHEET_HTML_URL, CHART_HTML_URL, GITHUB_REPO_URL } from './data/rawCsvFallback';
import { parseModelDataset } from './utils/csvParser';
import { loadModelsData } from './services/dataService';
import { ExplodedBarChart } from './components/ExplodedBarChart';
import { SearchBar } from './components/SearchBar';
import { Language, TRANSLATIONS } from './utils/i18n';
import { RefreshCw, Github, FileSpreadsheet, BarChart2 } from 'lucide-react';

export default function App() {
  // Language state (de | en)
  const [lang, setLang] = useState<Language>('de');
  const t = TRANSLATIONS[lang];

  // Pre-load all models from embedded fallback for instant zero-latency render
  const initialModels = useMemo(() => parseModelDataset(FALLBACK_CSV_CONTENT), []);
  const [models, setModels] = useState<ModelRecord[]>(initialModels);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  
  // Slider: Anzahl angezeigter Top-Modelle in 5er-Schritten (Standard: 30)
  const [topCount, setTopCount] = useState<number>(30);

  // Volle Explosion Schalter
  const [fullExplosionEnabled, setFullExplosionEnabled] = useState<boolean>(false);

  // Filter: Freitext-Suche und Schnellfilter mit Mehrfachauswahl (>1 Kategorie)
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [selectedCompany] = useState<string | null>(null);

  // Angezeigte Modelle basierend auf dem 5er-Schritt Slider
  const displayedModels = useMemo(() => {
    return models.slice(0, topCount);
  }, [models, topCount]);

  const handleToggleFamily = useCallback((family: string) => {
    setSelectedFamilies((prev) =>
      prev.includes(family) ? prev.filter((f) => f !== family) : [...prev, family]
    );
  }, []);

  const handleClearFamilies = useCallback(() => {
    setSelectedFamilies([]);
  }, []);

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

  // Match count for search/family filter
  const highlightedCount = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    const hasFilter = q.length > 0 || selectedFamilies.length > 0 || selectedCompany !== null;
    if (!hasFilter) return displayedModels.length;

    return displayedModels.filter((m) => {
      const matchesSearch =
        !q ||
        m.displayName.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.companyName.toLowerCase().includes(q) ||
        m.creatorClean.toLowerCase().includes(q);

      const matchesFamilies =
        selectedFamilies.length === 0 ||
        selectedFamilies.some((fam) => {
          const famLow = fam.toLowerCase();
          return (
            m.displayName.toLowerCase().includes(famLow) ||
            m.name.toLowerCase().includes(famLow) ||
            m.companyName.toLowerCase().includes(famLow) ||
            m.creatorClean.toLowerCase().includes(famLow)
          );
        });

      const matchesCompany =
        !selectedCompany ||
        m.companyName.toLowerCase() === selectedCompany.toLowerCase() ||
        m.creatorClean.toLowerCase().includes(selectedCompany.toLowerCase());

      return matchesSearch && matchesFamilies && matchesCompany;
    }).length;
  }, [displayedModels, searchFilter, selectedFamilies, selectedCompany]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans antialiased">
      {/* Clean top bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs px-4 sm:px-6 py-2.5">
        <div className="w-full max-w-[1720px] mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Title & Subtitle: Begrenzt auf maximal 2 Zeilen für optimale Lesbarkeit */}
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug line-clamp-2">
              {t.title}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal font-sans line-clamp-2">
              {t.subtitle}
            </p>
          </div>

          {/* Controls, language toggle & sync / external link icons */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono shrink-0 self-start xl:self-center">
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

            {/* Toggle: Volle Explosion ON / OFF */}
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
                title={fullExplosionEnabled ? 'Volle Explosion deaktivieren' : 'Alle Balken gleichzeitig vollständig explodieren'}
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

            <span className="hidden 2xl:inline text-slate-500 dark:text-slate-400 text-[11px]">
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

            {/* Statisches Diagramm als Icon neben Google Sheets & GitHub */}
            <a
              href={CHART_HTML_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              title={lang === 'de' ? 'Statisches Diagramm öffnen' : 'Open static chart'}
            >
              <BarChart2 className="w-4 h-4" />
            </a>

            <a
              href={SHEET_HTML_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Google Sheet öffnen"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </a>

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              title="GitHub Repository tomtomme/AI-Top30"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Bar Chart Container */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex flex-col space-y-2.5">
        {/* Search Bar mit 5er-Schritt-Slider und alphabetischen Schnellfiltern */}
        <SearchBar
          value={searchFilter}
          onChange={setSearchFilter}
          selectedFamilies={selectedFamilies}
          onToggleFamily={handleToggleFamily}
          onClearFamilies={handleClearFamilies}
          topCount={topCount}
          onTopCountChange={setTopCount}
          maxAvailableModels={models.length}
          matchCount={highlightedCount}
          totalCount={displayedModels.length}
          lang={lang}
        />

        {/* Balkendiagramm: Breit dargestellt, die volle Containerbreite nutzend */}
        <div className="w-full">
          <ExplodedBarChart
            models={displayedModels}
            activeBenchmarkId={null}
            fullExplosionEnabled={fullExplosionEnabled}
            searchFilter={searchFilter}
            selectedFamilies={selectedFamilies}
            selectedCompany={selectedCompany}
            lang={lang}
          />
        </div>
      </main>
    </div>
  );
}
