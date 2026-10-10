import React, { useState } from 'react';
import { ModelRecord, BenchmarkComponent } from '../types';
import { BENCHMARK_COMPONENTS } from '../data/benchmarks';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { ExternalLink } from 'lucide-react';

interface ExplodedBarChartProps {
  models: ModelRecord[];
  activeBenchmarkId: string | null;
  explodedViewEnabled?: boolean;
  fullExplosionEnabled: boolean;
  searchFilter: string;
  selectedFamilies?: string[];
  selectedCompany?: string | null;
  lang: Language;
  onExplosionStateChange?: (isExplodedActive: boolean) => void;
}

interface HoveredSegmentInfo {
  comp: BenchmarkComponent;
  model: ModelRecord;
  points: number;
  raw: number;
}

export const ExplodedBarChart: React.FC<ExplodedBarChartProps> = ({
  models,
  activeBenchmarkId,
  explodedViewEnabled = true,
  fullExplosionEnabled,
  searchFilter,
  selectedFamilies = [],
  selectedCompany = null,
  lang,
  onExplosionStateChange,
}) => {
  const t = TRANSLATIONS[lang];

  // Index of hovered bar
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<HoveredSegmentInfo | null>(null);

  // Y-axis scale: Maximum score in dataset is 69, max Y = 75
  const maxAxisScore = 75;
  const chartHeight = 500;
  const topPadding = 65; // Streamlined headroom now that the popup is integrated into the header bar
  const bottomPadding = 165; // Generous space below baseline for rotated model names with badges without clipping
  const availablePlotHeight = chartHeight - topPadding - bottomPadding; // 270px
  const baselineY = chartHeight - bottomPadding; // 335px

  const barWidth = 26;
  const barGap = 12;
  const totalBarSlot = barWidth + barGap; // 38px
  const marginLeft = 100; // Generous left margin so rotated text for bar 0 never clips off the left edge
  const marginRight = 40; // Right margin so the last bar and label are never clipped
  const chartWidth = Math.max(1050, marginLeft + models.length * totalBarSlot + marginRight);

  // Height formula strictly proportional to score
  const scaleY = (val: number) => {
    return (Math.max(0, val) / maxAxisScore) * availablePlotHeight;
  };

  // Determine if a model matches the search/family filters (multi-select supported)
  const isModelHighlighted = (model: ModelRecord): boolean => {
    const q = searchFilter.trim().toLowerCase();
    const matchesSearch =
      !q ||
      model.displayName.toLowerCase().includes(q) ||
      model.name.toLowerCase().includes(q) ||
      model.companyName.toLowerCase().includes(q) ||
      model.creatorClean.toLowerCase().includes(q);

    const matchesFamilies =
      selectedFamilies.length === 0 ||
      selectedFamilies.some((fam) => {
        const famLow = fam.toLowerCase();
        return (
          model.displayName.toLowerCase().includes(famLow) ||
          model.name.toLowerCase().includes(famLow) ||
          model.companyName.toLowerCase().includes(famLow) ||
          model.creatorClean.toLowerCase().includes(famLow)
        );
      });

    const matchesCompany =
      !selectedCompany ||
      model.companyName.toLowerCase() === selectedCompany.toLowerCase() ||
      model.creatorClean.toLowerCase().includes(selectedCompany.toLowerCase());

    return matchesSearch && matchesFamilies && matchesCompany;
  };

  const hasActiveHighlight =
    searchFilter.trim().length > 0 || selectedFamilies.length > 0 || selectedCompany !== null;

  // Is a bar exploded?
  const isExploded = (index: number) => {
    if (fullExplosionEnabled) return true;
    if (!explodedViewEnabled || hoveredIndex === null) return false;
    return index === hoveredIndex || index === hoveredIndex - 1 || index === hoveredIndex + 1;
  };

  const handleMouseEnter = (index: number) => {
    if (hoveredIndex !== index) {
      setHoveredIndex(index);
      setHoveredSegment(null);
    }
    if (onExplosionStateChange) onExplosionStateChange(true);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setHoveredSegment(null);
    if (onExplosionStateChange) {
      onExplosionStateChange(fullExplosionEnabled);
    }
  };

  const hoveredModel = hoveredIndex !== null ? models[hoveredIndex] : null;

  // Grid tick lines: 0, 10, 20, 30, 40, 50, 60, 70
  const yTicks = [0, 10, 20, 30, 40, 50, 60, 70];

  // Regional pattern fill for unexploded bars:
  // - USA: Blau mit weißen Sternen
  // - China: Rot mit gelber Sichel / Stern
  // - Europa / Frankreich: Blau-Gelb
  const getCountryBarFill = (model: ModelRecord): string => {
    if (
      model.flag.includes('🇨🇳') ||
      model.creatorClean.toLowerCase().includes('alibaba') ||
      model.creatorClean.toLowerCase().includes('deepseek') ||
      model.creatorClean.toLowerCase().includes('z.ai') ||
      model.creatorClean.toLowerCase().includes('moonshot') ||
      model.creatorClean.toLowerCase().includes('kimi') ||
      model.creatorClean.toLowerCase().includes('xiaomi') ||
      model.creatorClean.toLowerCase().includes('stepfun') ||
      model.creatorClean.toLowerCase().includes('minimax') ||
      model.creatorClean.toLowerCase().includes('inclusion')
    ) {
      return 'url(#pattern-china)';
    }

    if (
      model.flag.includes('🇫🇷') ||
      model.flag.includes('🇪🇺') ||
      model.creatorClean.toLowerCase().includes('mistral')
    ) {
      return 'url(#pattern-europe)';
    }

    // Default USA
    return 'url(#pattern-usa)';
  };

  // Determine if a company's favicon needs stronger zoom to eliminate excess whitespace
  const isZoomedCompany = (model: ModelRecord): boolean => {
    const norm = (model.companyName + ' ' + model.creatorClean + ' ' + model.displayName).toLowerCase();
    return (
      norm.includes('google') ||
      norm.includes('anthropic') ||
      norm.includes('openai') ||
      norm.includes('chatgpt') ||
      norm.includes('gpt') ||
      norm.includes('meta')
    );
  };

  // Format X-axis label without country flag, but with 💲, 🌐, and prominent ✦ NEW badge
  const formatAxisLabel = (model: ModelRecord): string => {
    let label = model.displayName;
    if (model.isNew) label += ' ✦ NEW';
    if (model.isPaid) label += ' 💲';
    else if (model.isFreeApi) label += ' 🌐';
    return label;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs transition-colors">
      {/* Non-intrusive Info Bar above chart: dynamically displays model & hovered segment information */}
      <div className="flex flex-col justify-between gap-1.5 min-h-[64px] pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
        {hoveredModel ? (
          <div className="flex flex-col gap-1 w-full">
            {/* Row 1: Model Identification + Hovered Segment or Summary Score */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-700 dark:text-slate-300 min-h-[24px]">
              {/* Model Name & Favicon (Clickable link if modelUrl is available) */}
              {hoveredModel.modelUrl ? (
                <a
                  href={hoveredModel.modelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors group cursor-pointer"
                  title={`${hoveredModel.displayName} Chatbot / App öffnen`}
                >
                  <span className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                    <img
                      src={hoveredModel.faviconUrl}
                      alt=""
                      className={`w-full h-full object-contain ${
                        isZoomedCompany(hoveredModel) ? 'scale-145' : 'scale-110'
                      }`}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </span>
                  <span className="underline decoration-slate-300 dark:decoration-slate-600 underline-offset-2 group-hover:decoration-blue-500">
                    {hoveredModel.displayName}
                  </span>
                  <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </a>
              ) : (
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-white border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
                    <img
                      src={hoveredModel.faviconUrl}
                      alt=""
                      className={`w-full h-full object-contain ${
                        isZoomedCompany(hoveredModel) ? 'scale-145' : 'scale-110'
                      }`}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </span>
                  {hoveredModel.displayName}
                </span>
              )}

              <span className="text-slate-400">·</span>
              <span className="font-mono text-slate-600 dark:text-slate-400">
                {t.company} <strong>{hoveredModel.companyName}</strong>
              </span>

              {/* Specific segment info if hovered, else summary score */}
              {hoveredSegment ? (
                <>
                  <span className="text-slate-400">·</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span
                      className="w-3 h-3 rounded-xs shrink-0 shadow-2xs border border-black/10 dark:border-white/10"
                      style={{ backgroundColor: hoveredSegment.comp.color }}
                    />
                    <span style={{ color: hoveredSegment.comp.color }}>
                      {lang === 'en' ? hoveredSegment.comp.nameEn : hoveredSegment.comp.nameDe}
                    </span>
                    <span className="font-mono text-slate-900 dark:text-white font-bold">
                      {Math.round(hoveredSegment.raw)}%
                    </span>
                    <span className="font-mono text-slate-500 dark:text-slate-400 font-normal">
                      (+{hoveredSegment.points.toFixed(1)} {t.points})
                    </span>
                  </div>

                  <span className="text-slate-400">·</span>
                  {hoveredSegment.comp.sourceUrl ? (
                    <a
                      href={hoveredSegment.comp.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-mono text-[11px] font-semibold transition-colors cursor-pointer"
                      title={`${hoveredSegment.comp.sourceName} Website öffnen (${hoveredSegment.comp.sourceUrl})`}
                    >
                      <span>{hoveredSegment.comp.sourceName}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <span className="font-mono text-[11px] text-slate-400">
                      {hoveredSegment.comp.sourceName}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="text-slate-400">·</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {t.score}: {hoveredModel.scoreNewReported ?? hoveredModel.scoreNewCalculated} {t.points} ({t.rank} #{hoveredModel.rank})
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {lang === 'de' ? 'Faktentreue' : 'Non-Hallucination'}: {hoveredModel.rawScores.nonHallucination}% (+{(hoveredModel.rawScores.nonHallucination / 8).toFixed(1)} {t.points})
                  </span>
                </>
              )}
            </div>

            {/* Row 2: Always present to guarantee rock-solid zero-shift height */}
            <div className="text-[11.5px] rounded px-2.5 py-1 border flex items-center gap-1.5 leading-relaxed min-h-[30px] transition-colors bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60">
              {hoveredSegment ? (
                <>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                    {lang === 'de' ? 'Kriterien-Beschreibung:' : 'Criterion:'}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {lang === 'en' ? hoveredSegment.comp.descriptionEn : hoveredSegment.comp.descriptionDe}
                  </span>
                </>
              ) : (
                <span className="text-slate-500 dark:text-slate-400">
                  {lang === 'de'
                    ? 'Bewege den Mauszeiger über die einzelnen Segmente des Balkens, um Kriterien-Details und Quellen anzuzeigen.'
                    : 'Hover over individual bar segments to view benchmark criteria & source links.'}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1 w-full">
            {/* Idle Row 1 */}
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 min-h-[24px]">
              <span className="font-bold text-slate-900 dark:text-white">AI-Top30 Ranking</span>
              <span className="text-slate-400">·</span>
              <span className="font-mono text-slate-600 dark:text-slate-400">
                {models.length} {t.modelsCount}
              </span>
              {hasActiveHighlight && (
                <>
                  <span className="text-slate-400">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {t.highlightActive} {models.filter(isModelHighlighted).length} {t.ofModelsMatch}
                  </span>
                </>
              )}
            </div>
            {/* Idle Row 2 */}
            <div className="text-[11.5px] text-slate-500 dark:text-slate-400 rounded px-2.5 py-1 border border-dashed border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-1.5 leading-relaxed min-h-[30px]">
              <span>
                {fullExplosionEnabled
                  ? t.fullExplosionHelp
                  : explodedViewEnabled
                  ? t.hoverHelp
                  : t.disabledHelp}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SVG Chart Container */}
      <div className="relative select-none w-full">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="block w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* USA: Blau mit weißen Sternen - Stärker gezoomt & dezent verteilt */}
            <pattern
              id="pattern-usa"
              x="24"
              width="38"
              height="42"
              patternUnits="userSpaceOnUse"
            >
              <rect width="38" height="42" fill="#1E3A8A" />
              {/* Gezoomter weißer 5-Zack-Stern zentriert auf dem Balken */}
              <polygon
                points="13,13.5 14.9,18.4 20.1,18.7 16.0,22.0 17.4,27.1 13,24.2 8.6,27.1 10.0,22.0 5.9,18.7 11.1,18.4"
                fill="#FFFFFF"
              />
              <circle cx="13" cy="0" r="1.6" fill="#FFFFFF" />
              <circle cx="13" cy="42" r="1.6" fill="#FFFFFF" />
            </pattern>

            {/* China: Rot mit gelber Sichel und Stern - Stärker gezoomt & dezent verteilt */}
            <pattern
              id="pattern-china"
              x="24"
              width="38"
              height="44"
              patternUnits="userSpaceOnUse"
            >
              <rect width="38" height="44" fill="#DC2626" />
              {/* Gezoomte Sichel */}
              <path
                d="M 8.5,14 A 7.5,7.5 0 1 0 17.5,23 A 5.5,5.5 0 1 1 8.5,14 Z"
                fill="#FACC15"
              />
              <line x1="17.5" y1="23" x2="21.5" y2="28" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" />
              {/* Gezoomter Stern */}
              <polygon
                points="18,8.2 19,10.6 21.6,10.6 19.5,12.2 20.2,14.6 18,13.1 15.8,14.6 16.5,12.2 14.4,10.6 17,10.6"
                fill="#FACC15"
              />
            </pattern>

            {/* Europa / Frankreich: Klassische Tricolore (Blau-Weiß-Rot) - Genau 3 Streifen je Balken */}
            <pattern
              id="pattern-europe"
              width="1"
              height="1"
              viewBox="0 0 3 1"
              preserveAspectRatio="none"
            >
              <rect x="0" y="0" width="1" height="1" fill="#002654" />
              <rect x="1" y="0" width="1" height="1" fill="#FFFFFF" />
              <rect x="2" y="0" width="1" height="1" fill="#ED2939" />
            </pattern>
          </defs>

          {/* Horizontal Gridlines */}
          {yTicks.map((tick) => {
            const yPos = baselineY - scaleY(tick);
            return (
              <g key={`tick-${tick}`}>
                <line
                  x1={marginLeft - 12}
                  y1={yPos}
                  x2={chartWidth - 25}
                  y2={yPos}
                  stroke={tick === 0 ? '#94A3B8' : '#E2E8F0'}
                  className="dark:stroke-slate-800"
                  strokeWidth={tick === 0 ? 1.5 : 1}
                />
                <text
                  x={marginLeft - 18}
                  y={yPos + 4}
                  textAnchor="end"
                  fill="#94A3B8"
                  fontSize="10"
                  fontFamily="monospace"
                  className="tabular-nums font-semibold"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Model Bars */}
          {models.map((model, index) => {
            const barX = marginLeft + index * totalBarSlot;
            const barCenterX = barX + barWidth / 2;
            const exploded = isExploded(index);
            const isHovered = hoveredIndex === index;
            const highlighted = isModelHighlighted(model);

            const score = model.scoreNewReported ?? model.scoreNewCalculated;
            const totalBarHeight = scaleY(score);
            const barCenterY = baselineY - totalBarHeight / 2;

            // Explosion gap
            const explosionGap = isHovered ? 2.5 : exploded ? (fullExplosionEnabled ? 2.2 : 1.8) : 0;

            // Stack segments from bottom to top
            let currentOffset = 0;
            const segments = model.breakdown.map((comp, segIdx) => {
              const segHeight = scaleY(comp.pointsContribution);
              const gapOffset = exploded ? segIdx * explosionGap : 0;
              const segY = baselineY - (currentOffset + segHeight + gapOffset);
              currentOffset += segHeight;
              return {
                comp,
                segHeight,
                segY,
              };
            });

            // Top of the bar
            const topSegment = segments[segments.length - 1];
            const barTopY = exploded && topSegment ? topSegment.segY : baselineY - totalBarHeight;

            // Unexploded country color fill: USA stars, China sickle, Europe blue-yellow
            const countryFill = getCountryBarFill(model);

            // Opacity handling
            let barOpacity = 1;
            if (hasActiveHighlight && !highlighted) {
              barOpacity = 0.22;
            } else if (!fullExplosionEnabled && hoveredIndex !== null && !exploded) {
              barOpacity = 0.45;
            }

            return (
              <g
                key={model.id}
                className="cursor-pointer transition-opacity duration-200"
                style={{ opacity: barOpacity }}
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
              >
                {/* Full-column invisible hit rect for smooth mouse tracking */}
                <rect
                  x={barX - barGap / 2}
                  y={topPadding - 40}
                  width={totalBarSlot}
                  height={chartHeight - topPadding + 20}
                  fill="transparent"
                />

                {/* Highlight halo under matching models */}
                {hasActiveHighlight && highlighted && (
                  <rect
                    x={barX - 2}
                    y={barTopY - 2}
                    width={barWidth + 4}
                    height={baselineY - barTopY + 4}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="1.5"
                    rx="3"
                    className="opacity-70"
                  />
                )}

                {/* The 8 Segments */}
                {segments.map((seg, sIdx) => {
                  const isBenchmarkFocused = activeBenchmarkId === seg.comp.id;
                  const isOtherFocused = activeBenchmarkId !== null && !isBenchmarkFocused;

                  const fillColor = exploded ? seg.comp.color : countryFill;
                  const opacity = isOtherFocused && exploded ? 0.35 : 1;
                  const isTop = sIdx === segments.length - 1;
                  const benchMeta = BENCHMARK_COMPONENTS.find((b) => b.id === seg.comp.id);

                  return (
                    <g key={seg.comp.id}>
                      <rect
                        x={barX}
                        y={seg.segY}
                        width={barWidth}
                        height={Math.max(1, seg.segHeight)}
                        rx={exploded ? 1.5 : isTop ? 2 : 0}
                        ry={exploded ? 1.5 : isTop ? 2 : 0}
                        fill={fillColor}
                        opacity={opacity}
                        stroke={
                          exploded
                            ? 'rgba(255,255,255,0.3)'
                            : model.flag.includes('🇨🇳')
                            ? '#991B1B'
                            : model.flag.includes('🇫🇷')
                            ? '#002654'
                            : '#1E3A8A'
                        }
                        strokeWidth={exploded ? 0.5 : 0.75}
                        style={{
                          transition: 'y 0.25s ease-out, fill 0.25s ease-out, opacity 0.2s',
                        }}
                        onMouseEnter={() => {
                          if (exploded && benchMeta) {
                            setHoveredSegment({
                              comp: benchMeta,
                              model,
                              points: seg.comp.pointsContribution,
                              raw: seg.comp.rawValue,
                            });
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredSegment(null);
                        }}
                      />

                      {/* Originale Prozentzahl mittig im jeweiligen Balkenteil bei Explosion (auch Nachbarbalken & volle Explosion) */}
                      {exploded && seg.segHeight >= 6 && (
                        <text
                          x={barCenterX}
                          y={seg.segY + seg.segHeight / 2 + 3}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize={seg.segHeight < 11 ? '8' : '8.5'}
                          fontFamily="monospace"
                          fontWeight="bold"
                          pointerEvents="none"
                          style={{
                            textShadow: '0 1px 2px rgba(0,0,0,0.85), 0 0 1px rgba(0,0,0,0.95)',
                          }}
                        >
                          {`${Math.round(seg.comp.rawValue)}%`}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* MITTIGES FAVICON AUF UNEXPLODIERTEN BALKEN - STÄRKER GEZOOMT FÜR GOOGLE, ANTHROPIC, OPENAI, META */}
                {!exploded && totalBarHeight >= 22 && (() => {
                  const isZoomed = isZoomedCompany(model);
                  const circleRadius = 11.5;
                  const imgSize = isZoomed ? 27 : 19;
                  const clipId = `clip-unexp-${model.id}`;

                  return (
                    <g pointerEvents="none" className="transition-opacity duration-200">
                      <defs>
                        <clipPath id={clipId}>
                          <circle cx={barCenterX} cy={barCenterY} r={circleRadius - 0.75} />
                        </clipPath>
                      </defs>
                      <circle
                        cx={barCenterX}
                        cy={barCenterY}
                        r={circleRadius}
                        fill="#FFFFFF"
                        stroke="rgba(0,0,0,0.35)"
                        strokeWidth="1"
                      />
                      <image
                        href={model.faviconUrl}
                        x={barCenterX - imgSize / 2}
                        y={barCenterY - imgSize / 2}
                        width={imgSize}
                        height={imgSize}
                        preserveAspectRatio="xMidYMid meet"
                        clipPath={`url(#${clipId})`}
                      />
                    </g>
                  );
                })()}

                {/* Score Number directly above the bar */}
                <text
                  x={barCenterX}
                  y={barTopY - 6}
                  textAnchor="middle"
                  fill={isHovered || (hasActiveHighlight && highlighted) ? '#0F172A' : '#64748B'}
                  className="dark:fill-slate-300 font-bold tabular-nums"
                  fontSize="10"
                  fontFamily="monospace"
                  style={{
                    transition: 'y 0.25s ease-out',
                  }}
                >
                  {score}
                </text>

                {/* Company Favicon shifted high enough and larger above exploded bar */}
                {exploded && isHovered && (() => {
                  const isZoomed = isZoomedCompany(model);
                  const circleRadius = 13;
                  const imgSize = isZoomed ? 33 : 23;
                  const clipId = `clip-exp-hov-${model.id}`;

                  return (
                    <g
                      pointerEvents="none"
                      style={{
                        transition: 'opacity 0.2s ease-out',
                      }}
                    >
                      <defs>
                        <clipPath id={clipId}>
                          <circle cx={barCenterX} cy={barTopY - 38} r={circleRadius - 0.75} />
                        </clipPath>
                      </defs>
                      <circle
                        cx={barCenterX}
                        cy={barTopY - 38}
                        r={circleRadius}
                        fill="#FFFFFF"
                        stroke="rgba(0,0,0,0.2)"
                        strokeWidth="1"
                      />
                      <image
                        href={model.faviconUrl}
                        x={barCenterX - imgSize / 2}
                        y={barTopY - 38 - imgSize / 2}
                        width={imgSize}
                        height={imgSize}
                        preserveAspectRatio="xMidYMid meet"
                        clipPath={`url(#${clipId})`}
                      />
                    </g>
                  );
                })()}

                {/* Companion Mini-Favicon above Neighbor Exploded Bars */}
                {exploded && !isHovered && !fullExplosionEnabled && (() => {
                  const isZoomed = isZoomedCompany(model);
                  const circleRadius = 10;
                  const imgSize = isZoomed ? 25 : 17;
                  const clipId = `clip-exp-nbr-${model.id}`;

                  return (
                    <g pointerEvents="none" opacity="0.9">
                      <defs>
                        <clipPath id={clipId}>
                          <circle cx={barCenterX} cy={barTopY - 32} r={circleRadius - 0.75} />
                        </clipPath>
                      </defs>
                      <circle
                        cx={barCenterX}
                        cy={barTopY - 32}
                        r={circleRadius}
                        fill="#FFFFFF"
                        stroke="rgba(0,0,0,0.15)"
                        strokeWidth="0.75"
                      />
                      <image
                        href={model.faviconUrl}
                        x={barCenterX - imgSize / 2}
                        y={barTopY - 32 - imgSize / 2}
                        width={imgSize}
                        height={imgSize}
                        preserveAspectRatio="xMidYMid meet"
                        clipPath={`url(#${clipId})`}
                      />
                    </g>
                  );
                })()}

                {/* Rotated Model Name below Baseline: OHNE Flagge, mit vergrößerten 💲, 🌐 Symbolen & klickbar falls modelUrl vorhanden */}
                <g transform={`translate(${barCenterX}, ${baselineY + 12})`}>
                  {model.modelUrl ? (
                    <a
                      href={model.modelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer group"
                    >
                      <text
                        x="0"
                        y="0"
                        textAnchor="end"
                        transform="rotate(-52)"
                        fill={isHovered || (hasActiveHighlight && highlighted) ? '#2563EB' : '#475569'}
                        className="dark:fill-slate-300 transition-colors hover:fill-blue-600 dark:hover:fill-blue-400 cursor-pointer"
                        fontSize="10"
                        fontWeight={isHovered || (hasActiveHighlight && highlighted) ? '700' : '500'}
                      >
                        <title>{`${model.displayName} Chatbot / App öffnen`}</title>
                        {model.displayName}
                        {model.isNew && (
                          <tspan fill="#F59E0B" fontWeight="bold"> ✦ NEW</tspan>
                        )}
                        {model.isPaid && (
                          <tspan fontSize="15" fontWeight="bold" fill="#059669"> 💲</tspan>
                        )}
                        {model.isFreeApi && (
                          <tspan fontSize="15" fontWeight="bold" fill="#2563EB"> 🌐</tspan>
                        )}
                      </text>
                    </a>
                  ) : (
                    <text
                      x="0"
                      y="0"
                      textAnchor="end"
                      transform="rotate(-52)"
                      fill={isHovered || (hasActiveHighlight && highlighted) ? '#0F172A' : '#475569'}
                      className="dark:fill-slate-300 transition-colors"
                      fontSize="10"
                      fontWeight={isHovered || (hasActiveHighlight && highlighted) ? '700' : '500'}
                    >
                      {model.displayName}
                      {model.isNew && (
                        <tspan fill="#F59E0B" fontWeight="bold"> ✦ NEW</tspan>
                      )}
                      {model.isPaid && (
                        <tspan fontSize="15" fontWeight="bold" fill="#059669"> 💲</tspan>
                      )}
                      {model.isFreeApi && (
                        <tspan fontSize="15" fontWeight="bold" fill="#2563EB"> 🌐</tspan>
                      )}
                    </text>
                  )}
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
