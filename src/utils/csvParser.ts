import { BENCHMARK_COMPONENTS } from '../data/benchmarks';
import { getCompanyMeta, getFaviconUrl } from '../data/companies';
import { ComponentBreakdown, ModelRecord, RawBenchmarkScores } from '../types';

/**
 * Robust RFC-4180 CSV line parser handling quotes, embedded commas, and escaped quotes.
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Parse numeric string safely, supporting European commas like "81,6" or "-40"
 */
function parseNum(val: string | undefined): number | null {
  if (!val) return null;
  const clean = val.trim().replace(',', '.').replace(/%/g, '');
  if (clean === '' || clean === '-' || clean.toLowerCase() === 'max' || clean.toLowerCase() === 'min') {
    return null;
  }
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

/**
 * Extracts flag emoji from text if present
 */
function extractFlag(text: string): { flag: string; cleanText: string } {
  const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/;
  const match = text.match(flagRegex);
  if (match) {
    return {
      flag: match[0],
      cleanText: text.replace(flagRegex, '').trim()
    };
  }
  return { flag: '', cleanText: text.trim() };
}

/**
 * Parses raw CSV into structured model records for the Top 30 table and expanded timeline.
 * 1. Parses the curated Top 30 from the top section.
 * 2. Parses additional models from the full timeline (starting at "Full Timeline:").
 * Deduplicates by cleaned model name so the Top 30 stay authoritative at ranks 1..30.
 */
export function parseModelDataset(csvText: string): ModelRecord[] {
  const rows = parseCsvRows(csvText);
  if (rows.length < 3) return [];

  // Find header row containing "10 Evals" or "Act Code" or "Creator | Release"
  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(10, rows.length); r++) {
    const rowStr = rows[r].join(' ');
    if (rowStr.includes('10 Evals') || rowStr.includes('Non-Hallucination') || rowStr.includes('Creator | Release')) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 1;
  }

  const parseRowToModel = (row: string[], rIdx: number): ModelRecord | null => {
    if (!row || row.length < 5) return null;

    const rawNameCell = (row[1] || '').trim();
    const rawCreatorCell = (row[2] || '').trim();

    if (!rawNameCell && !rawCreatorCell) return null;
    if (
      rawNameCell.includes('Sources & Notes') ||
      rawNameCell.includes('Full Timeline') ||
      rawNameCell.includes('Expectations') ||
      rawNameCell.includes('Rumors') ||
      rawNameCell === 'min' ||
      rawNameCell === 'mean' ||
      rawNameCell === 'median' ||
      rawNameCell === 'max' ||
      rawNameCell.startsWith('count')
    ) {
      return null;
    }
    if (rawCreatorCell.includes('Sources & Notes') || rawCreatorCell.includes('Company')) {
      return null;
    }

    // Extract Flag and Name
    const { flag: nameFlag, cleanText: cleanedName } = extractFlag(rawNameCell);
    const { flag: creatorFlag, cleanText: cleanedCreator } = extractFlag(rawCreatorCell);
    const flag = nameFlag || creatorFlag || '🌐';

    // Model badges
    const isPaid = rawNameCell.includes('💲');
    const isFreeApi = rawNameCell.includes('🌐');
    const isNew = rawNameCell.includes('🆕');

    const displayName = cleanedName
      .replace(/💲/g, '')
      .replace(/🌐/g, '')
      .replace(/🆕/g, '')
      .trim();

    if (!displayName || displayName.length < 2) return null;

    // Parse Benchmark Columns (D through K):
    const valD = parseNum(row[3]);
    const valE = parseNum(row[4]);
    const valF = parseNum(row[5]);
    const valG = parseNum(row[6]);
    const valH = parseNum(row[7]);
    const valI = parseNum(row[8]);
    const valJ = parseNum(row[9]);
    const valK = parseNum(row[10]);

    const hasAll8 =
      valD !== null &&
      valE !== null &&
      valF !== null &&
      valG !== null &&
      valH !== null &&
      valI !== null &&
      valJ !== null &&
      valK !== null;

    const rawScores: RawBenchmarkScores = {
      actCodeReason: valD ?? 0,
      nonHallucination: valE ?? 0,
      scienceKnowledge: valF ?? 0,
      visionPlot: valG ?? 0,
      medReasoning: valH ?? 0,
      excelAgent: valI ?? 0,
      trickQuestions: valJ ?? 0,
      econLegal: valK ?? 0,
    };

    const scoreNewReported = parseNum(row[12]);
    const scoreOld = parseNum(row[11]);
    const scoreWorstCase = parseNum(row[13]);

    // Calculate components according to formula:
    const rawContributions: { comp: typeof BENCHMARK_COMPONENTS[0]; raw: number; transformed: number; pts: number }[] = [];
    let sumTransformed = 0;

    BENCHMARK_COMPONENTS.forEach((comp) => {
      const raw = rawScores[comp.key];
      const transformed = comp.transform(raw);
      const pts = transformed / 8;
      rawContributions.push({ comp, raw, transformed, pts });
      sumTransformed += pts;
    });

    const scoreNewCalculated = parseFloat(sumTransformed.toFixed(2));
    const targetScore = scoreNewReported ?? scoreOld ?? Math.round(scoreNewCalculated);

    if (targetScore <= 0) return null;

    // Normalize points contribution slightly to match the reported score height exactly
    const normFactor = sumTransformed > 0 ? targetScore / sumTransformed : 1;

    const breakdown: ComponentBreakdown[] = rawContributions.map(({ comp, raw, transformed, pts }) => {
      const normalizedContribution = parseFloat((pts * normFactor).toFixed(2));
      return {
        id: comp.id,
        name: comp.nameDe,
        color: comp.color,
        rawValue: raw,
        transformedValue: transformed,
        pointsContribution: normalizedContribution,
        percentageOfTotal: targetScore > 0 ? parseFloat(((normalizedContribution / targetScore) * 100).toFixed(1)) : 0,
      };
    });

    const storyline = (row[14] || '').trim();
    const chatLinkRaw = (row[15] || '').trim();
    const apiLinkRaw = (row[16] || '').trim();

    // Helper to extract first valid http URL from a cell string
    const extractHttpUrl = (str: string): string | undefined => {
      if (!str) return undefined;
      const match = str.match(/https?:\/\/[^\s,]+/);
      return match ? match[0].trim() : undefined;
    };

    const parsedChatLink = extractHttpUrl(chatLinkRaw);
    const parsedApiLink = extractHttpUrl(apiLinkRaw);
    // Modell-Link: Link aus Spalte P; wenn Spalte P kein Link (sondern nur Text wie z.B. "paid"), dann Link aus Spalte Q; sonst undefined
    const modelUrl = parsedChatLink || parsedApiLink;

    const company = getCompanyMeta(cleanedCreator);
    const faviconUrl = getFaviconUrl(company.domain);

    return {
      id: `${displayName}-${rIdx}`,
      rank: 0,
      flag,
      name: rawNameCell,
      displayName,
      isPaid,
      isFreeApi,
      isNew,
      creator: rawCreatorCell,
      creatorClean: cleanedCreator,
      companyName: company.name,
      releaseDate: '',
      releaseText: cleanedCreator,
      rawScores,
      hasAll8Benchmarks: hasAll8,
      breakdown,
      scoreOld,
      scoreNewCalculated: targetScore,
      scoreNewReported: targetScore,
      scoreWorstCase,
      storyline,
      chatLink: parsedChatLink,
      apiLink: parsedApiLink,
      modelUrl,
      companyDomain: company.domain,
      companyColor: company.color,
      faviconUrl,
    };
  };

  const topModels: ModelRecord[] = [];
  const seenNames = new Set<string>();

  // 1. Parse top table (stop when hitting section break or timeline)
  let timelineRowIndex = -1;
  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    const rowStr = (row || []).join(' ');
    if (rowStr.includes('Full Timeline:') || rowStr.includes('Full Timeline')) {
      timelineRowIndex = r;
      break;
    }
    if (rowStr.includes('Sources & Notes')) {
      // Timeline might come soon after
      continue;
    }

    const model = parseRowToModel(row, r);
    if (model) {
      const cleanKey = model.displayName.toLowerCase();
      if (!seenNames.has(cleanKey)) {
        seenNames.add(cleanKey);
        topModels.push(model);
      }
    }
  }

  // Sort top models descending by score
  topModels.sort((a, b) => (b.scoreNewReported ?? 0) - (a.scoreNewReported ?? 0));

  // 2. Parse timeline starting from timelineRowIndex
  const timelineModels: ModelRecord[] = [];
  if (timelineRowIndex !== -1) {
    for (let r = timelineRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      const model = parseRowToModel(row, r);
      if (model) {
        const cleanKey = model.displayName.toLowerCase();
        if (!seenNames.has(cleanKey)) {
          seenNames.add(cleanKey);
          timelineModels.push(model);
        }
      }
    }
  }

  // Sort timeline models descending by score
  timelineModels.sort((a, b) => (b.scoreNewReported ?? 0) - (a.scoreNewReported ?? 0));

  // Combine top models first, then timeline models
  const allModels = [...topModels, ...timelineModels];

  // Assign sequential ranks 1..N
  allModels.forEach((m, idx) => {
    m.rank = idx + 1;
  });

  return allModels;
}
