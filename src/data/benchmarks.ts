import { BenchmarkComponent } from '../types';

/**
 * Benchmark components sorted exactly in the column order of the raw table:
 * Col D: Act Code Reason Research (IQ)
 * Col E: Non-Hallucination-Rate (Faktentreue)
 * Col F: Science Knowledge (Faktenwissen)
 * Col G: Vision / Plot Reading (Diagrammanalyse)
 * Col H: Medical Long Cont. Reasoning (Diagnostik)
 * Col I: Analysis Excel Agent (Excel)
 * Col J: Trick-Questions & 3D Reasoning (Trickfragen & 3D-Vorstellung)
 * Col K: 7 Evals: Econ Excel Code Legal (Wirtschaft & Recht)
 */
export const BENCHMARK_COMPONENTS: BenchmarkComponent[] = [
  {
    id: 'actCodeReason',
    key: 'actCodeReason',
    nameDe: 'IQ',
    nameEn: 'IQ (10 Evals)',
    sourceName: 'Spalte D · AA-II v4.3',
    color: '#8B5CF6', // Purple
    darkColor: '#7C3AED',
    lightBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    descriptionDe: 'Kombinierter IQ-Test aus Tausenden Aufgaben: Programmierung, Argumentation und Recherche.',
    descriptionEn: 'Meta-analysis across coding, reasoning, agentic execution, and research.',
    formulaDesc: 'D / 8',
    weightPct: 12.5,
    transform: (val: number) => Math.max(0, Math.min(100, val)),
  },
  {
    id: 'nonHallucination',
    key: 'nonHallucination',
    nameDe: 'Faktentreue',
    nameEn: 'Non-Hallucination Rate',
    sourceName: 'Spalte E · Non-Hallu-Rate',
    color: '#10B981', // Emerald
    darkColor: '#059669',
    lightBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    descriptionDe: 'Misst, wie ehrlich und erfindungsfrei das Modell bei Wissenslücken antwortet. Anteil an der Gesamtnote.',
    descriptionEn: 'Measures factual reliability and refusal to fabricate when answers are unknown.',
    formulaDesc: 'E / 8',
    weightPct: 12.5,
    transform: (val: number) => Math.max(0, Math.min(100, val)),
  },
  {
    id: 'scienceKnowledge',
    key: 'scienceKnowledge',
    nameDe: 'Faktenwissen',
    nameEn: 'Science Knowledge',
    sourceName: 'Spalte F · AA-Omniscience',
    color: '#3B82F6', // Blue
    darkColor: '#2563EB',
    lightBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    descriptionDe: 'Belohnt korrekte wissenschaftliche Antworten, bestraft Halluzinationen. Skaliert von -100..+100 auf 0..100%.',
    descriptionEn: 'Scientific reasoning across empirical domains, penalizing hallucinations.',
    formulaDesc: '(F / 2 + 50) / 8',
    weightPct: 12.5,
    transform: (val: number) => Math.max(0, Math.min(100, val / 2 + 50)),
  },
  {
    id: 'visionPlot',
    key: 'visionPlot',
    nameDe: 'Diagrammanalyse',
    nameEn: 'Plot Reading (MMMU-Pro)',
    sourceName: 'Spalte G · MMMU-Pro',
    color: '#F59E0B', // Amber
    darkColor: '#D97706',
    lightBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    descriptionDe: 'Verständnis wissenschaftlicher Diagramme und Bildanalysen. Reskaliert ab Mindestbasis 29% auf 0–100%.',
    descriptionEn: 'Chart comprehension and multimodal image reading benchmark.',
    formulaDesc: '1.4085 × (G - 29) / 8',
    weightPct: 12.5,
    transform: (val: number) => Math.max(0, Math.min(100, 1.4085 * (val - 29))),
  },
  {
    id: 'medReasoning',
    key: 'medReasoning',
    nameDe: 'Diagnostik',
    nameEn: 'Medical Reasoning',
    sourceName: 'Spalte H · MLCR-AA',
    color: '#F43F5E', // Rose
    darkColor: '#E11D48',
    lightBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    descriptionDe: 'Prüft klinische Fallanalysen über Hunderte Seiten hinweg ohne Widersprüche in der Gedankenführung.',
    descriptionEn: 'Clinical literature reasoning across long document contexts.',
    formulaDesc: 'H / 8',
    weightPct: 12.5,
    transform: (val: number) => Math.max(0, Math.min(100, val)),
  },
  {
    id: 'excelAgent',
    key: 'excelAgent',
    nameDe: 'Excel',
    nameEn: 'Excel Agent',
    sourceName: 'Spalte I · ExcelAgent',
    color: '#06B6D4', // Cyan
    darkColor: '#0891B2',
    lightBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    descriptionDe: 'Praktische Tabellen- und Datenverarbeitung in Tabellenkalkulationen und statistischen Umgebungen.',
    descriptionEn: 'Autonomous quantitative operations and workflow execution inside Excel.',
    formulaDesc: 'I / 8',
    weightPct: 12.5,
    transform: (val: number) => Math.max(0, Math.min(100, val)),
  },
  {
    id: 'trickQuestions',
    key: 'trickQuestions',
    nameDe: 'Trickfragen & 3D-Vorstellung',
    nameEn: 'Trick Questions & 3D Spatial',
    sourceName: 'Spalte J · SimpleBench',
    color: '#6366F1', // Indigo
    darkColor: '#4F46E5',
    lightBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    descriptionDe: '200 Fangfragen zu Alltagswelt und räumlicher Intuition. Reskaliert ab Ratechance 16.67% auf 0–100%.',
    descriptionEn: 'Spatial common sense and resistance to adversarial trick questions.',
    formulaDesc: '1.2 × (J - 16.6666) / 8',
    weightPct: 12.5,
    transform: (val: number) => Math.max(0, Math.min(100, 1.2 * (val - 16.6666))),
  },
  {
    id: 'econLegal',
    key: 'econLegal',
    nameDe: 'Wirtschaft & Recht',
    nameEn: 'Econ & Legal',
    sourceName: 'Spalte K · Vals Econ 2',
    color: '#EA580C', // Orange
    darkColor: '#C2410C',
    lightBg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    descriptionDe: 'Mehrstufige quantitative Finanzanalysen, juristisches Verstehen und Unternehmenslogik.',
    descriptionEn: 'Professional quantitative workflows in finance, legal, and econometrics.',
    formulaDesc: 'K / 8',
    weightPct: 12.5,
    transform: (val: number) => Math.max(0, Math.min(100, val)),
  },
];
