"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
    <div className={cn("max-w-full overflow-hidden", className ?? "rounded-lg border border-zinc-800 bg-[#0c0c18] p-4")}>
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

      <div className={cn("relative w-full max-w-full overflow-hidden", mapClassName ?? "h-[380px]")}>
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

                    {/* Continuous telemetry: a fixed set of arc "slots", each of
                        which independently respawns with a NEW weighted-random
                        source -> destination pair when its lifecycle ends. New
                        routes launch constantly and the visible set keeps
                        changing — never a fixed pool repeating the same paths. */}
                    {telemetryMode === "arcs" && (
                      <ArcStream hotspots={hotspots} zoom={zoomState.zoom} />
                    )}

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

// Pick one weighted-random source -> destination pair from the incident
// countries. Origins are weighted by sqrt(incident count) so busy countries
// launch more arcs (routes read as "pressure" flows); destinations are uniform
// so the whole active set gets represented over time.
function pickArcPair(hotspots: Hotspot[]): { from: Hotspot; to: Hotspot } | null {
  if (hotspots.length < 2) return null;
  const weights = hotspots.map((h) => Math.sqrt(Math.max(1, h.count)));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const pickWeighted = () => {
    let t = Math.random() * totalWeight;
    for (let i = 0; i < hotspots.length; i++) {
      t -= weights[i];
      if (t <= 0) return i;
    }
    return hotspots.length - 1;
  };
  const fromIdx = pickWeighted();
  let toIdx = Math.floor(Math.random() * hotspots.length);
  if (toIdx === fromIdx) toIdx = (toIdx + 1) % hotspots.length;
  return { from: hotspots[fromIdx], to: hotspots[toIdx] };
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

type ArcSlot = {
  slotId: number;
  generation: number;
  from: Hotspot;
  to: Hotspot;
};

// Continuous telemetry: a fixed number of arc "slots", each of which respawns
// with a fresh weighted-random pair when its lifecycle ends. Each respawn bumps
// the slot's `generation` so ONLY that one arc remounts/animates the new path —
// the others keep running, so new routes launch constantly and the set never
// snaps all at once. With prefers-reduced-motion we render a calm static set
// (no timers, no SMIL).
function ArcStream({ hotspots, zoom }: { hotspots: Hotspot[]; zoom: number }) {
  const reducedMotion = usePrefersReducedMotion();
  const [slots, setSlots] = useState<ArcSlot[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // The parent rebuilds `hotspots` (fresh array) on every render — zoom, pan,
  // tooltip state, etc. Keep the latest in a ref so respawns read current data,
  // and key the (re)initialise effect on a stable CONTENT signature so it only
  // fires when the participating countries actually change (not every render,
  // which would reset the timers and kill the animation).
  const hotspotsRef = useRef(hotspots);
  hotspotsRef.current = hotspots;
  const signature = hotspots.map((h) => `${h.code}:${h.count}`).join("|");
  const slotCount = Math.min(8, Math.max(3, Math.floor(hotspots.length * 0.6)));

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const current = hotspotsRef.current;
    if (current.length < 2) {
      setSlots([]);
      return;
    }
    const initial: ArcSlot[] = [];
    for (let i = 0; i < slotCount; i++) {
      const pair = pickArcPair(current);
      if (pair) initial.push({ slotId: i, generation: 0, from: pair.from, to: pair.to });
    }
    setSlots(initial);

    if (reducedMotion) return; // static set — no respawns

    const respawn = (slotId: number) => {
      setSlots((prev) =>
        prev.map((s) => {
          if (s.slotId !== slotId) return s;
          const pair = pickArcPair(hotspotsRef.current);
          if (!pair) return s;
          return { ...s, generation: s.generation + 1, from: pair.from, to: pair.to };
        }),
      );
      schedule(slotId);
    };
    const schedule = (slotId: number) => {
      const delay = 7000 + Math.random() * 3000; // 7–10s cadence
      const t = setTimeout(() => respawn(slotId), delay);
      timers.current.push(t);
    };
    // Pre-stagger first respawns so the pool launches continuously, not in unison.
    initial.forEach((s) => {
      const t = setTimeout(() => respawn(s.slotId), 1200 * s.slotId + Math.random() * 800);
      timers.current.push(t);
    });
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, reducedMotion, slotCount]);

  const anchors = useMemo(() => {
    const m = new Map<string, Hotspot>();
    for (const s of slots) {
      m.set(s.from.code, s.from);
      m.set(s.to.code, s.to);
    }
    return Array.from(m.values());
  }, [slots]);

  return (
    <>
      {slots.map((s) => (
        <TelemetryArc
          key={`slot-${s.slotId}-${s.generation}`}
          from={s.from.coordinates}
          to={s.to.coordinates}
          tone={s.to.tone}
          index={s.slotId}
          total={slotCount}
          reducedMotion={reducedMotion}
        />
      ))}
      {/* Subtle, unlabeled endpoint anchors for the currently-active routes. */}
      {anchors.map((spot) => {
        const r = Math.max(1.6, 2.4 / Math.max(1, zoom * 0.6));
        return (
          <Marker key={`node-${spot.code}`} coordinates={spot.coordinates}>
            <g className="pointer-events-none">
              <circle r={r * 2.2} fill={toneColor(spot.tone)} opacity={0.16}>
                {!reducedMotion && (
                  <animate attributeName="opacity" values="0.05;0.22;0.05" dur="3.6s" repeatCount="indefinite" />
                )}
              </circle>
              <circle r={r} fill={toneColor(spot.tone)} opacity={0.85} />
            </g>
          </Marker>
        );
      })}
    </>
  );
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
  index,
  total,
  reducedMotion = false,
}: {
  from: [number, number];
  to: [number, number];
  tone: Hotspot["tone"];
  index: number;
  total: number;
  reducedMotion?: boolean;
}) {
  const ctx = useMapContext() as any;
  // Build a CURVED arc (quadratic bezier bowed away from the midpoint) between
  // the projected endpoints — the classic threat-map look — rather than the
  // straight Mercator line.
  const pathData = useMemo(() => {
    const projection = ctx?.projection;
    if (typeof projection !== "function") return "";
    const a = projection(from);
    const b = projection(to);
    if (!a || !b || !Number.isFinite(a[0]) || !Number.isFinite(b[0])) return "";
    const [x1, y1] = a;
    const [x2, y2] = b;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy) || 1;
    // Perpendicular offset for the control point; longer arcs bow more.
    const bow = Math.min(dist * 0.28, 70);
    const cx = mx - (dy / dist) * bow;
    const cy = my - (dx / dist) * -bow;
    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  }, [ctx, from, to]);

  const color = toneColor(tone);

  // Each arc has its own lifecycle phase so the pool launches continuously,
  // never all at once. Cycle: draw-in -> particle travel -> fade-out -> idle.
  const cycle = 7 + (index % 4) * 0.9; // 7–9.7s, varied per arc
  const begin = -((index / Math.max(total, 1)) * cycle).toFixed(2); // negative = pre-staggered
  const travel = cycle * 0.42;

  if (!pathData) return null;

  // Reduced motion: render a calm static route (no draw-in, particle, or fade).
  if (reducedMotion) {
    return (
      <g className="pointer-events-none">
        <path d={pathData} fill="none" stroke={color} strokeWidth={0.8} opacity={0.4} />
      </g>
    );
  }

  return (
    <g className="pointer-events-none">
      {/* Faint full path so the route reads even between pulses. */}
      <path d={pathData} fill="none" stroke={color} strokeWidth={0.6} opacity={0.1} />
      {/* Bright segment that draws in (dashoffset 1->0) then fades — the launch. */}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={1.3}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1 1"
        style={{ filter: `drop-shadow(0 0 2px ${color})` }}
      >
        <animate
          attributeName="stroke-dashoffset"
          values="1; 0; 0"
          keyTimes="0; 0.5; 1"
          dur={`${cycle}s`}
          begin={`${begin}s`}
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0; 0.85; 0.85; 0"
          keyTimes="0; 0.12; 0.55; 0.74"
          dur={`${cycle}s`}
          begin={`${begin}s`}
          repeatCount="indefinite"
        />
      </path>
      {/* Travelling particle that arrives at the destination during the launch. */}
      <circle r="2.4" fill={color} opacity="0">
        <animate
          attributeName="opacity"
          values="0; 1; 1; 0"
          keyTimes="0; 0.1; 0.5; 0.6"
          dur={`${cycle}s`}
          begin={`${begin}s`}
          repeatCount="indefinite"
        />
        <animateMotion
          dur={`${travel}s`}
          begin={`${begin}s`}
          repeatCount="indefinite"
          path={pathData}
          keyPoints="0;1"
          keyTimes="0;1"
          calcMode="spline"
          keySplines="0.4 0 0.2 1"
        />
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
