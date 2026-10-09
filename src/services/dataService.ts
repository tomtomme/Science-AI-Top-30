import { FALLBACK_CSV_CONTENT, RAW_CSV_URL } from '../data/rawCsvFallback';
import { ModelRecord } from '../types';
import { parseModelDataset } from '../utils/csvParser';

export interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  error: string | null;
  isUsingFallback: boolean;
  dataSource: 'live' | 'fallback';
}

/**
 * Fetch raw CSV from Google Sheets with cache-busting query parameter
 */
export async function fetchLiveCsv(): Promise<{ csvText: string; isLive: boolean }> {
  try {
    const cacheBuster = `_t=${Date.now()}`;
    const url = `${RAW_CSV_URL}&${cacheBuster}`;
    
    // Attempt live fetch with a 8-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/csv, text/plain, */*',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Google Sheets responded with HTTP status ${response.status}`);
    }

    const csvText = await response.text();
    // Verify that we received valid CSV content rather than an HTML error page
    if (csvText.includes('<HTML>') || csvText.includes('<!DOCTYPE') || csvText.length < 200) {
      throw new Error('Received HTML response instead of CSV');
    }

    return { csvText, isLive: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn('Google Sheets live fetch warning (using embedded fallback):', errorMsg);
    return { csvText: FALLBACK_CSV_CONTENT, isLive: false };
  }
}

/**
 * Loads models, either live or from fallback
 */
export async function loadModelsData(): Promise<{
  models: ModelRecord[];
  isLive: boolean;
  error: string | null;
}> {
  const { csvText, isLive } = await fetchLiveCsv();
  try {
    const models = parseModelDataset(csvText);
    if (models.length === 0) {
      throw new Error('Keine Datensätze gefunden');
    }
    return { models, isLive, error: null };
  } catch (err) {
    const fallbackModels = parseModelDataset(FALLBACK_CSV_CONTENT);
    return {
      models: fallbackModels,
      isLive: false,
      error: err instanceof Error ? err.message : 'Parser-Fehler'
    };
  }
}
