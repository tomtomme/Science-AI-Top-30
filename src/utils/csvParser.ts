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
 * Parses raw CSV into structured model records for the Top 30 table.
 * Specifically extracts only the top 30 models from the top section of the raw sheet.
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

  const models: ModelRecord[] = [];

  // Only parse the top table (stop when hitting empty row or "Sources & Notes" or "Full Timeline")
  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length < 5) break;

    const rawNameCell = (row[1] || '').trim();
    const rawCreatorCell = (row[2] || '').trim();

    // Stop condition: empty row or section break
    if (!rawNameCell && !rawCreatorCell) break;
    if (
      rawNameCell.includes('Sources & Notes') ||
      rawNameCell.includes('Full Timeline') ||
      rawNameCell.includes('Expectations') ||
      rawNameCell.includes('Rumors')
    ) {
      break;
    }
    if (rawCreatorCell.includes('Sources & Notes') || rawCreatorCell.includes('Company')) {
      break;
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

    if (!displayName || displayName.length < 2) continue;

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

    // Calculate components according to formula:
    // =IF(COUNTBLANK(D:K)=0; AVERAGE(D:E; (F/2+50); 1,4085*(G-29); H:I; 1,2*(J-16,6666); K); "")
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
    const scoreNewReported = parseNum(row[12]);
    const targetScore = scoreNewReported ?? Math.round(scoreNewCalculated);

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

    // Col L (col 11): OLD
    // Col N (col 13): Worst Case
    // Col O (col 14): Storyline
    // Col P (col 15): Link to Chat or App
    // Col Q (col 16): Other links
    const scoreOld = parseNum(row[11]);
    const scoreWorstCase = parseNum(row[13]);
    const storyline = (row[14] || '').trim();
    const chatLink = (row[15] || '').trim();
    const apiLink = (row[16] || '').trim();

    const company = getCompanyMeta(cleanedCreator);
    const faviconUrl = getFaviconUrl(company.domain);

    models.push({
      id: `${displayName}-${r}`,
      rank: models.length + 1,
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
      chatLink: chatLink.startsWith('http') ? chatLink : undefined,
      apiLink: apiLink.startsWith('http') ? apiLink : undefined,
      companyDomain: company.domain,
      companyColor: company.color,
      faviconUrl,
    });
  }

  // Sort descending by score (highest on left, lowest on right -> higher from right to left!)
  models.sort((a, b) => {
    return (b.scoreNewReported ?? 0) - (a.scoreNewReported ?? 0);
  });

  // Re-assign ranks 1..30
  models.forEach((m, idx) => {
    m.rank = idx + 1;
  });

  return models.slice(0, 30);
}
