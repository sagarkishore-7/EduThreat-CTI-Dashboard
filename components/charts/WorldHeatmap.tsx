"use client";

import { useEffect, useMemo, useState } from "react";
import { geoCentroid } from "d3-geo";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
  useMapContext,
} from "react-simple-maps";
import type { CountByCategory } from "@/lib/api";
import { cn, COUNTRY_NAME_TO_CODE, formatNumber, getCountryFlag } from "@/lib/utils";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const DEFAULT_CENTER: [number, number] = [10, 20];
const DEFAULT_ZOOM = 1;

type TelemetryMode = "none" | "choropleth" | "dots" | "arcs";

type Hotspot = {
  code: string;
  name: string;
  count: number;
  percentage: number;
  coordinates: [number, number];
  tone: "threat" | "warn" | "info";
  rank: number;
};

type ZoomState = {
  coordinates: [number, number];
  zoom: number;
};

// ISO 3166-1 numeric to alpha-2 mapping for matching
const NUMERIC_TO_ALPHA2: Record<string, string> = {
  "004": "AF", "008": "AL", "012": "DZ", "020": "AD", "024": "AO",
  "032": "AR", "036": "AU", "040": "AT", "048": "BH", "050": "BD",
  "056": "BE", "060": "BM", "068": "BO", "070": "BA", "076": "BR",
  "100": "BG", "124": "CA", "152": "CL", "156": "CN", "144": "LK",
  "170": "CO", "188": "CR", "191": "HR", "196": "CY", "203": "CZ",
  "208": "DK", "218": "EC", "222": "SV", "233": "EE", "246": "FI", "250": "FR",
  "276": "DE", "300": "GR", "344": "HK", "348": "HU", "352": "IS",
  "356": "IN", "360": "ID", "364": "IR", "368": "IQ", "372": "IE", "376": "IL",
  "380": "IT", "388": "JM", "392": "JP", "400": "JO", "404": "KE",
  "410": "KR", "414": "KW", "422": "LB", "428": "LV", "434": "LY",
  "438": "LI", "440": "LT", "442": "LU", "458": "MY", "470": "MT",
  "484": "MX", "504": "MA", "512": "OM", "516": "NA", "528": "NL",
  "554": "NZ", "566": "NG", "578": "NO", "586": "PK", "604": "PE",
  "608": "PH", "616": "PL", "620": "PT", "630": "PR", "634": "QA",
  "642": "RO", "643": "RU", "682": "SA", "702": "SG", "703": "SK",
  "705": "SI", "710": "ZA", "724": "ES", "752": "SE", "756": "CH",
  "788": "TN", "792": "TR", "804": "UA", "818": "EG", "826": "GB",
  "834": "TZ", "840": "US", "858": "UY", "704": "VN", "716": "ZW", "862": "VE",
  "398": "KZ", "192": "CU", "760": "SY", "729": "SD", "600": "PY",
  "417": "KG", "831": "GG", "214": "DO", "112": "BY",
};

interface WorldHeatmapProps {
  data: CountByCategory[];
  onCountryClick?: (country: string) => void;
  showHeader?: boolean;
  showTopCountries?: boolean;
  className?: string;
  mapClassName?: string;
  telemetryMode?: TelemetryMode;
  showControls?: boolean;
}

export function WorldHeatmap({
  data,
  onCountryClick,
  showHeader = true,
  showTopCountries = true,
  className,
  mapClassName,
  telemetryMode = "none",
  showControls = false,
}: WorldHeatmapProps) {
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [zoomState, setZoomState] = useState<ZoomState>({
    coordinates: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
  });
  // Reshuffle the random arc routes periodically so the telemetry continuously
  // cycles through *all* incident countries rather than fixed pairs.
  const [arcSeed, setArcSeed] = useState(0);
  useEffect(() => {
    if (telemetryMode !== "arcs") return;
    const id = setInterval(() => setArcSeed((s) => s + 1), 4200);
    return () => clearInterval(id);
  }, [telemetryMode]);

  const countByCode = useMemo(() => {
    const map: Record<string, { count: number; name: string; percentage: number; flag?: string }> = {};
    data.forEach((item) => {
      const code = item.country_code?.toUpperCase() || COUNTRY_NAME_TO_CODE[item.category];
      if (code) {
        map[code] = {
          count: item.count,
          name: item.category,
          percentage: item.percentage,
          flag: item.flag_emoji,
        };
      }
    });
    return map;
  }, [data]);

  const maxCount = useMemo(() => Math.max(...data.map((d) => d.count), 1), [data]);

  const topCountry = data[0];

  function getColor(count: number): string {
    if (count === 0) return "#161a26";
    const intensity = Math.pow(count / maxCount, 0.42);
    const r = Math.round(10 + intensity * 18);
    const g = Math.round(18 + intensity * 178);
    const b = Math.round(34 + intensity * 188);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function getStrokeColor(count: number): string {
    return count > 0 ? "rgba(77, 188, 255, 0.38)" : "rgba(255,255,255,0.05)";
  }

  const zoomIn = () =>
    setZoomState((current) => ({
      ...current,
      zoom: Math.min(Number((current.zoom * 1.35).toFixed(2)), 4.5),
    }));

  const zoomOut = () =>
    setZoomState((current) => ({
      ...current,
      zoom: Math.max(Number((current.zoom / 1.35).toFixed(2)), 1),
    }));

  const resetView = () =>
    setZoomState({
      coordinates: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

  return (
    <div className={className ?? "rounded-lg border border-zinc-800 bg-[#0c0c18] p-4"}>
      {showHeader && (
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              Global Threat Map
            </p>
            <h3 className="text-sm font-semibold text-zinc-200">Education Sector — Incident Heatmap</h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <LegendSwatch color="#161a26" label="0" />
            <LegendSwatch color={getColor(maxCount * 0.25)} label="Low" />
            <LegendSwatch color={getColor(maxCount * 0.5)} label="Med" />
            <LegendSwatch color={getColor(maxCount)} label="High" />
          </div>
        </div>
      )}

      <div className={cn("relative", mapClassName ?? "h-[380px]")}>
        {showControls && (
          <div className="absolute right-3 top-3 z-20 flex flex-col gap-2">
            <MapControl label="+" onClick={zoomIn} />
            <MapControl label="−" onClick={zoomOut} />
            <MapControl label="⤧" onClick={resetView} compact />
          </div>
        )}

        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 130,
            center: DEFAULT_CENTER,
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup
            center={zoomState.coordinates}
            zoom={zoomState.zoom}
            minZoom={1}
            maxZoom={4.5}
            onMoveEnd={(position) => {
              setZoomState({
                coordinates: position.coordinates as [number, number],
                zoom: position.zoom,
              });
            }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) => {
                const hotspots = geographies
                  .map((geo) => {
                    const numericId = String(geo.id || "");
                    const alpha2 = NUMERIC_TO_ALPHA2[numericId] || geo.properties?.["ISO_A2"] || "";
                    const info = countByCode[alpha2];
                    if (!info || info.count <= 0) return null;
                    const centroid = geoCentroid(geo as never) as [number, number];
                    if (!Number.isFinite(centroid[0]) || !Number.isFinite(centroid[1])) return null;
                    return {
                      code: alpha2,
                      name: info.name,
                      count: info.count,
                      percentage: info.percentage,
                      coordinates: centroid,
                    };
                  })
                  .filter(Boolean)
                  .sort((a, b) => (b?.count || 0) - (a?.count || 0))
                  .map((item, index) => ({
                    ...(item as NonNullable<typeof item>),
                    tone: (index === 0 ? "threat" : index < 5 ? "warn" : "info") as Hotspot["tone"],
                    rank: index,
                  })) as Hotspot[];

                const arcPairs =
                  telemetryMode === "arcs"
                    ? buildRandomArcPairs(hotspots, arcSeed)
                    : [];

                return (
                  <>
                    {geographies.map((geo) => {
                      const numericId = String(geo.id || "");
                      const alpha2 = NUMERIC_TO_ALPHA2[numericId] || geo.properties?.["ISO_A2"] || "";
                      const info = countByCode[alpha2];
                      const count = info?.count || 0;
                      const countryName = info?.name || geo.properties?.name || "Unknown";

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={getColor(count)}
                          stroke={getStrokeColor(count)}
                          strokeWidth={count > 0 ? 0.6 : 0.4}
                          style={{
                            default: { outline: "none" },
                            hover: {
                              outline: "none",
                              fill: count > 0 ? "#1be7c8" : "#262d40",
                              stroke: "#4dbcff",
                              strokeWidth: 1,
                              cursor: count > 0 ? "pointer" : "default",
                            },
                            pressed: { outline: "none" },
                          }}
                          onMouseEnter={(evt) => {
                            const label = count > 0
                              ? `${getCountryFlag(alpha2 || countryName, info?.flag)} ${countryName}: ${count} incident${count !== 1 ? "s" : ""}`
                              : `${countryName}: No incidents`;
                            setTooltipContent(label);
                            setTooltipPosition({
                              x: evt.clientX,
                              y: evt.clientY,
                            });
                            setShowTooltip(true);
                          }}
                          onMouseLeave={() => setShowTooltip(false)}
                          onClick={() => {
                            if (count > 0 && onCountryClick) {
                              onCountryClick(countryName);
                            }
                          }}
                        />
                      );
                    })}

                    {/* The arcSeed in the key remounts the routes on each reshuffle
                        so the travel animation replays for the new random set. */}
                    {arcPairs.map((arc, index) => (
                      <TelemetryArc
                        key={`${arcSeed}-${arc.from.code}-${arc.to.code}`}
                        from={arc.from.coordinates}
                        to={arc.to.coordinates}
                        tone={arc.to.tone}
                        duration={2.8 + index * 0.4}
                      />
                    ))}

                    {/* Endpoint nodes for the *active* arc routes only: subtle,
                        unlabeled anchors so the travelling arcs read as pressure
                        routes between the currently-highlighted countries. */}
                    {telemetryMode === "arcs" &&
                      Array.from(
                        new Map(
                          arcPairs.flatMap((arc) => [
                            [arc.from.code, arc.from],
                            [arc.to.code, arc.to],
                          ]),
                        ).values(),
                      ).map((spot) => {
                        const r = Math.max(1.6, 2.4 / Math.max(1, zoomState.zoom * 0.6));
                        return (
                          <Marker key={`node-${arcSeed}-${spot.code}`} coordinates={spot.coordinates}>
                            <g className="pointer-events-none">
                              <circle r={r * 2.2} fill={toneColor(spot.tone)} opacity={0.16} />
                              <circle r={r} fill={toneColor(spot.tone)} opacity={0.85} />
                            </g>
                          </Marker>
                        );
                      })}

                    {/* Density dots: pulsing markers WITHOUT code/number labels.
                        Only in "dots" mode (choropleth and arcs show no dots). */}
                    {telemetryMode === "dots" &&
                      hotspots.map((spot, index) => {
                        const radius = scaledMarkerRadius(spot.count, hotspots[0]?.count || 1, zoomState.zoom);
                        const pulseOpacity =
                          spot.rank < 3 ? 0.78 : spot.rank < 10 ? 0.56 : 0.38;
                        return (
                          <Marker key={spot.code} coordinates={spot.coordinates}>
                            <g className="pointer-events-none">
                              <circle
                                r={radius * 1.8}
                                fill={spot.tone === "threat" ? "rgba(255,71,87,0.22)" : "rgba(77,188,255,0.18)"}
                                opacity={pulseOpacity}
                              />
                              <circle r={radius} fill={toneColor(spot.tone)} opacity={pulseOpacity} />
                              <circle r={Math.max(1.8, radius * 0.24)} fill="#f8fafc" />
                              <circle r={radius} fill="none" stroke={toneColor(spot.tone)} opacity={Math.max(0.32, pulseOpacity)}>
                                <animate
                                  attributeName="r"
                                  from={radius.toString()}
                                  to={(radius * 1.95).toString()}
                                  dur={`${2.2 + index * 0.35}s`}
                                  repeatCount="indefinite"
                                />
                                <animate
                                  attributeName="opacity"
                                  from={String(Math.max(0.32, pulseOpacity))}
                                  to="0"
                                  dur={`${2.2 + index * 0.35}s`}
                                  repeatCount="indefinite"
                                />
                              </circle>
                            </g>
                          </Marker>
                        );
                      })}
                  </>
                );
              }}
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {telemetryMode !== "none" && topCountry && (
          <div className="absolute bottom-3 left-3 z-20 w-[230px] rounded-2xl border border-zinc-700/80 bg-[#080b12]/92 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.38)] backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xl">
                {getCountryFlag(topCountry.country_code || topCountry.category, topCountry.flag_emoji)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-100">{topCountry.category}</p>
                <p className="text-[11px] font-mono text-zinc-500">Top open-country pressure</p>
              </div>
            </div>
            <MetricRow label="Incident volume" value={formatNumber(topCountry.count)} highlight />
            <MetricRow label="Corpus share" value={`${topCountry.percentage.toFixed(1)}%`} />
            <MetricRow label="Map mode" value={telemetryMode.toUpperCase()} />
          </div>
        )}

        {showTooltip && (
          <div
            className="pointer-events-none fixed z-50 rounded-lg border px-3 py-2 text-sm"
            style={{
              left: tooltipPosition.x + 12,
              top: tooltipPosition.y - 30,
              backgroundColor: "#111118",
              borderColor: "#27272a",
            }}
          >
            {tooltipContent}
          </div>
        )}
      </div>

      {showTopCountries && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {data.slice(0, 8).map((item) => (
            <button
              key={item.category}
              onClick={() => onCountryClick?.(item.category)}
              className="flex items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-secondary"
            >
              <span className="text-lg">
                {getCountryFlag(item.category, item.flag_emoji)}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs text-muted-foreground">
                  {item.category}
                </span>
                <span className="text-sm font-semibold">{formatNumber(item.count)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Deterministic-per-seed PRNG so a given reshuffle is stable across re-renders
// but varies every interval tick.
function seededRandom(seed: number) {
  let s = (seed * 2654435761) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Build a fresh set of RANDOM source -> destination arcs drawn from *all* the
// countries that have incidents (not a fixed top-N from a constant origin). Each
// reshuffle (new seed) picks different pairs, so the telemetry continuously
// cycles through the whole active country set. Higher-incident countries are
// lightly favoured as origins so the routes still read as "pressure" flows.
function buildRandomArcPairs(hotspots: Hotspot[], seed: number) {
  if (hotspots.length < 2) return [];
  const rand = seededRandom(seed + 1);
  const arcCount = Math.min(6, Math.max(2, Math.floor(hotspots.length / 2)));

  // Weighted pick of an origin (by incident count); uniform pick of a distinct
  // destination across all countries.
  const weights = hotspots.map((h) => Math.sqrt(Math.max(1, h.count)));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const pickWeighted = () => {
    let t = rand() * totalWeight;
    for (let i = 0; i < hotspots.length; i++) {
      t -= weights[i];
      if (t <= 0) return i;
    }
    return hotspots.length - 1;
  };

  const pairs: { from: Hotspot; to: Hotspot }[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (pairs.length < arcCount && guard++ < arcCount * 12) {
    const fromIdx = pickWeighted();
    const toIdx = Math.floor(rand() * hotspots.length);
    if (fromIdx === toIdx) continue;
    const key = fromIdx < toIdx ? `${fromIdx}-${toIdx}` : `${toIdx}-${fromIdx}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ from: hotspots[fromIdx], to: hotspots[toIdx] });
  }
  return pairs;
}

function scaledMarkerRadius(count: number, maxCount: number, zoom: number) {
  const base = 6 + (count / Math.max(maxCount, 1)) * 12;
  return base / Math.pow(Math.max(zoom, 1), 0.48);
}

function toneColor(tone: Hotspot["tone"]) {
  if (tone === "threat") return "#ff4757";
  if (tone === "warn") return "#ff8c42";
  return "#4dbcff";
}

function TelemetryArc({
  from,
  to,
  tone,
  duration,
}: {
  from: [number, number];
  to: [number, number];
  tone: Hotspot["tone"];
  duration: number;
}) {
  const { path } = useMapContext();
  const pathData = useMemo(
    () => path({ type: "LineString", coordinates: [from, to] }) || "",
    [from, path, to],
  );

  const color = toneColor(tone);

  if (!pathData) return null;

  return (
    <g className="pointer-events-none">
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={1.15}
        strokeDasharray="4 6"
        opacity={0.28}
      />
      <circle r="2.6" fill={color} opacity="0.98">
        <animateMotion dur={`${duration}s`} repeatCount="indefinite" path={pathData} />
      </circle>
    </g>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="h-3 w-3 rounded-sm" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

function MapControl({
  label,
  onClick,
  compact = false,
}: {
  label: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "grid place-items-center rounded-lg border border-zinc-700/80 bg-[#080b12]/92 text-zinc-200 backdrop-blur-xl transition-colors hover:border-emerald-400/35 hover:text-emerald-300",
        compact ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm",
      )}
    >
      {label}
    </button>
  );
}

function MetricRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-[11px]">
      <span className="text-zinc-500">{label}</span>
      <span className={cn("font-mono", highlight ? "text-red-300" : "text-zinc-100")}>{value}</span>
    </div>
  );
}
