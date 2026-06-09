"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three";
import { geoCentroid } from "d3-geo";
import { feature } from "topojson-client";
import type { CountByCategory } from "@/lib/api";
import { cn, COUNTRY_NAME_TO_CODE, formatNumber, getCountryFlag } from "@/lib/utils";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ISO 3166-1 numeric → alpha-2 (matches the 2D map so incident counts join the
// same way). Kept local so the globe is self-contained.
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

// Contrasting multi-hue palette for the telemetry arcs — adjacent launches use
// clearly different colours so the map reads as varied, not monotone.
const ARC_PALETTE = [
  "#22d3ee", "#e879f9", "#f59e0b", "#a78bfa",
  "#a3e635", "#fb7185", "#38bdf8", "#34d399",
];

type Hotspot = {
  code: string;
  name: string;
  count: number;
  lat: number;
  lng: number;
  tone: "threat" | "warn" | "info";
  rank: number;
};

type Arc = {
  id: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: [string, string];
  gap: number; // stable per-arc dash phase
};

function toneColor(tone: Hotspot["tone"]) {
  if (tone === "threat") return "#ff4757";
  if (tone === "warn") return "#ff8c42";
  return "#4dbcff";
}

const codeOf = (geo: any): string =>
  NUMERIC_TO_ALPHA2[String(geo.id || "")] || geo.properties?.["ISO_A2"] || "";

// ── Stable accessor functions (module scope) ──────────────────────────────────
// react-globe.gl re-applies any prop whose *reference* changes between renders;
// re-applying an arc accessor rebuilds every arc's material and restarts its dash
// animation in lockstep — the source of the stutter when arcs swap every couple
// of seconds. Keeping these references constant means only `arcsData` changes on
// a swap, so just the replaced arc restarts and the rest animate smoothly.
const arcStartLat = (d: any) => d.startLat;
const arcStartLng = (d: any) => d.startLng;
const arcEndLat = (d: any) => d.endLat;
const arcEndLng = (d: any) => d.endLng;
const arcColorA = (d: any) => d.color;
const arcGapA = (d: any) => d.gap;
const ringLatA = (d: any) => d.lat;
const ringLngA = (d: any) => d.lng;
const ringColorA = (d: any) => {
  const base = toneColor(d.tone);
  return (t: number) => base + Math.round((1 - t) * 200).toString(16).padStart(2, "0");
};
const ringPeriodA = (d: any) => 900 + (d.rank % 4) * 250;
const pointLatA = (d: any) => d.lat;
const pointLngA = (d: any) => d.lng;
const pointColorA = (d: any) => toneColor(d.tone);
const polygonSideColorC = () => "rgba(0, 216, 180, 0.08)";
const polygonStrokeColorC = () => "rgba(77, 188, 255, 0.25)";
const EMPTY: any[] = [];

interface ThreatGlobeProps {
  data: CountByCategory[];
  onCountryClick?: (country: string) => void;
  className?: string;
  /** Layer emphasis driven by the page's mode toggle. */
  mode?: "choropleth" | "dots" | "arcs";
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

export function ThreatGlobe({ data, onCountryClick, className, mode = "arcs" }: ThreatGlobeProps) {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [features, setFeatures] = useState<any[]>([]);
  // Hovered country → a leader-line callout anchored in the empty space beside
  // the globe (instead of a cursor tooltip that overlapped the corner controls).
  const [hover, setHover] = useState<
    { lat: number; lng: number; flag: string; name: string; count: number } | null
  >(null);
  const [leader, setLeader] = useState<{ x: number; y: number; visible: boolean } | null>(null);
  const [arcs, setArcs] = useState<Arc[]>([]);

  // Measure container so the canvas fills it responsively.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setSize({ w: Math.floor(cr.width), h: Math.floor(cr.height) });
    });
    ro.observe(el);
    setSize({ w: Math.floor(el.clientWidth), h: Math.floor(el.clientHeight) });
    return () => ro.disconnect();
  }, []);

  // Load + convert the world topojson to GeoJSON country features (once).
  useEffect(() => {
    let cancelled = false;
    fetch(GEO_URL)
      .then((r) => r.json())
      .then((topo) => {
        if (cancelled) return;
        const fc: any = feature(topo, topo.objects.countries);
        setFeatures(fc.features || []);
      })
      .catch(() => setFeatures([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const countByCode = useMemo(() => {
    const map: Record<string, { count: number; name: string; percentage: number; flag?: string }> = {};
    data.forEach((item) => {
      const code = item.country_code?.toUpperCase() || COUNTRY_NAME_TO_CODE[item.category];
      if (code) {
        map[code] = { count: item.count, name: item.category, percentage: item.percentage, flag: item.flag_emoji };
      }
    });
    return map;
  }, [data]);

  const maxCount = useMemo(() => Math.max(...data.map((d) => d.count), 1), [data]);

  // Incident-bearing countries → hotspots (centroid + tone by rank).
  const hotspots = useMemo<Hotspot[]>(() => {
    if (!features.length) return [];
    const list: Hotspot[] = [];
    for (const geo of features) {
      const code = codeOf(geo);
      const info = countByCode[code];
      if (!info || info.count <= 0) continue;
      const c = geoCentroid(geo as never) as [number, number];
      if (!Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
      list.push({ code, name: info.name, count: info.count, lat: c[1], lng: c[0], tone: "info", rank: 0 });
    }
    list.sort((a, b) => b.count - a.count);
    return list.map((h, i) => ({
      ...h,
      rank: i,
      tone: i === 0 ? "threat" : i < 5 ? "warn" : "info",
    }));
  }, [features, countByCode]);

  // ── Continuous arc telemetry (ONLY in "arcs" mode) ────────────────────────
  // Weighted-random source (by sqrt incident count) → uniform destination. Every
  // ~2.4s we replace one arc with a fresh pair + colour, so routes keep changing
  // without disturbing the others; globe.gl animates the travelling dash natively.
  const arcCount = Math.min(9, Math.max(3, Math.floor(hotspots.length * 0.7)));
  const arcIdRef = useRef(0);
  const colorIdxRef = useRef(0);

  useEffect(() => {
    if (mode !== "arcs" || reducedMotion || hotspots.length < 2) {
      setArcs([]);
      return;
    }
    const weights = hotspots.map((h) => Math.sqrt(Math.max(1, h.count)));
    const total = weights.reduce((a, b) => a + b, 0);
    const pickFrom = () => {
      let t = Math.random() * total;
      for (let i = 0; i < hotspots.length; i++) {
        t -= weights[i];
        if (t <= 0) return i;
      }
      return hotspots.length - 1;
    };
    const makeArc = (): Arc => {
      const fi = pickFrom();
      let ti = Math.floor(Math.random() * hotspots.length);
      if (ti === fi) ti = (ti + 1) % hotspots.length;
      const c0 = ARC_PALETTE[colorIdxRef.current % ARC_PALETTE.length];
      colorIdxRef.current += 1;
      const a = hotspots[fi];
      const b = hotspots[ti];
      return {
        id: arcIdRef.current++,
        startLat: a.lat,
        startLng: a.lng,
        endLat: b.lat,
        endLng: b.lng,
        color: [c0, c0],
        gap: Math.random(),
      };
    };
    setArcs(Array.from({ length: arcCount }, makeArc));
    // Replace exactly one arc per tick (staggered) → smooth, continuously
    // changing set rather than a synchronized reshuffle.
    const interval = setInterval(() => {
      setArcs((prev) => {
        if (prev.length === 0) return Array.from({ length: arcCount }, makeArc);
        const next = prev.slice();
        next[Math.floor(Math.random() * next.length)] = makeArc();
        return next;
      });
    }, 2400);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotspots, mode, reducedMotion, arcCount]);

  const showRings = mode !== "choropleth" && !reducedMotion;
  const points = mode === "dots" ? hotspots : EMPTY;

  // ── Stable data-dependent accessors ──
  const polygonAltitude = useCallback(
    (d: any) => ((countByCode[codeOf(d)]?.count || 0) > 0 ? 0.012 : 0.006),
    [countByCode],
  );
  const polygonCapColor = useCallback(
    (d: any) => {
      const count = countByCode[codeOf(d)]?.count || 0;
      if (count <= 0) return "rgba(22,26,38,0.85)";
      const intensity = Math.pow(count / maxCount, 0.42);
      const r = Math.round(10 + intensity * 18);
      const g = Math.round(18 + intensity * 178);
      const b = Math.round(34 + intensity * 188);
      return `rgba(${r}, ${g}, ${b}, 0.92)`;
    },
    [countByCode, maxCount],
  );
  const onPolygonHover = useCallback(
    (d: any) => {
      if (!d) {
        setHover(null);
        return;
      }
      const code = codeOf(d);
      const info = countByCode[code];
      const name = info?.name || d.properties?.name || "Unknown";
      const count = info?.count || 0;
      const c = geoCentroid(d as never) as [number, number];
      if (!Number.isFinite(c[0]) || !Number.isFinite(c[1])) {
        setHover(null);
        return;
      }
      setHover({ lat: c[1], lng: c[0], flag: getCountryFlag(code || name, info?.flag), name, count });
    },
    [countByCode],
  );
  const onPolygonClick = useCallback(
    (d: any) => {
      const info = countByCode[codeOf(d)];
      const name = info?.name || d.properties?.name;
      if ((info?.count || 0) > 0 && name && onCountryClick) onCountryClick(name);
    },
    [countByCode, onCountryClick],
  );
  const ringMaxRadius = useCallback((d: any) => 3 + Math.min(7, (d.count / maxCount) * 7), [maxCount]);
  const pointRadius = useCallback((d: any) => 0.45 + Math.min(1.1, (d.count / maxCount) * 1.1), [maxCount]);
  // Float the markers clearly ABOVE the raised choropleth (incident-country
  // polygons sit at altitude 0.012); a point at 0.01 was rendered *under* the
  // country surface, so the dots looked like they were below the map and were
  // barely visible.
  const pointAltitude = useCallback(
    (d: any) => 0.05 + Math.min(0.16, (d.count / maxCount) * 0.16),
    [maxCount],
  );

  // Dark globe material + atmosphere; auto-rotate; sensible initial POV.
  const globeMaterial = useMemo(() => {
    const m = new THREE.MeshPhongMaterial({ color: "#0a0f1a" });
    m.shininess = 6;
    return m;
  }, []);

  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    try {
      g.pointOfView({ lat: 25, lng: 10, altitude: 2.3 }, 0);
      const controls = g.controls?.();
      if (controls) {
        controls.autoRotate = !reducedMotion;
        controls.autoRotateSpeed = 0.55;
        controls.enableZoom = true;
        controls.minDistance = 180;
        controls.maxDistance = 520;
      }
    } catch {
      /* globe not ready yet */
    }
  }, [reducedMotion, size.w, size.h, features.length]);

  // While a country is hovered: pause auto-rotation (so the callout is stable)
  // and track the country's on-screen position via rAF, with a facing test so
  // the leader line hides if the point rotates to the far side of the globe.
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    try {
      const controls = g.controls?.();
      if (controls) controls.autoRotate = !reducedMotion && !hover;
    } catch {
      /* ignore */
    }
    if (!hover) {
      setLeader(null);
      return;
    }
    let raf = 0;
    const tick = () => {
      try {
        const sc = g.getScreenCoords(hover.lat, hover.lng, 0.02);
        const coords = g.getCoords(hover.lat, hover.lng, 0);
        const cam = g.camera();
        const pv = new THREE.Vector3(coords.x, coords.y, coords.z).normalize();
        const cv = new THREE.Vector3().copy(cam.position).normalize();
        const visible = pv.dot(cv) > 0.12;
        if (sc && Number.isFinite(sc.x) && Number.isFinite(sc.y)) {
          setLeader({ x: sc.x, y: sc.y, visible });
        } else {
          setLeader(null);
        }
      } catch {
        setLeader(null);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hover, reducedMotion]);

  // Callout box geometry (right-side empty space beside the globe sphere).
  const BOX_W = 212;
  const BOX_RIGHT = 16;
  const boxLeft = Math.max(12, size.w - BOX_RIGHT - BOX_W);
  const boxTop = Math.round(size.h * 0.26);
  const anchorX = boxLeft;
  const anchorY = boxTop + 34;
  const calloutVisible = !!hover && !!leader && leader.visible;

  return (
    <div ref={containerRef} className={cn("relative h-full w-full", className)}>
      {size.w > 0 && (
        <Globe
          ref={globeRef}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={globeMaterial}
          showAtmosphere
          atmosphereColor="#1be7c8"
          atmosphereAltitude={0.16}
          // ── Choropleth (country polygons) ──
          polygonsData={features}
          polygonAltitude={polygonAltitude}
          polygonCapColor={polygonCapColor}
          polygonSideColor={polygonSideColorC}
          polygonStrokeColor={polygonStrokeColorC}
          polygonsTransitionDuration={0}
          onPolygonHover={onPolygonHover}
          onPolygonClick={onPolygonClick}
          // ── Pulsing hotspot rings (dots + arcs modes) ──
          ringsData={showRings ? hotspots : EMPTY}
          ringLat={ringLatA}
          ringLng={ringLngA}
          ringColor={ringColorA}
          ringMaxRadius={ringMaxRadius}
          ringPropagationSpeed={2}
          ringRepeatPeriod={ringPeriodA}
          // ── Hotspot point markers (dots mode only) ──
          pointsData={points}
          pointLat={pointLatA}
          pointLng={pointLngA}
          pointColor={pointColorA}
          pointRadius={pointRadius}
          pointAltitude={pointAltitude}
          pointsMerge={false}
          // ── Telemetry arcs (arcs mode only) ──
          arcsData={arcs}
          arcStartLat={arcStartLat}
          arcStartLng={arcStartLng}
          arcEndLat={arcEndLat}
          arcEndLng={arcEndLng}
          arcColor={arcColorA}
          arcStroke={0.5}
          arcAltitudeAutoScale={0.45}
          arcDashLength={0.5}
          arcDashGap={1.4}
          arcDashInitialGap={arcGapA}
          arcDashAnimateTime={reducedMotion ? 0 : 2600}
          arcsTransitionDuration={0}
        />
      )}

      {/* Hover callout: a leader line from the country out to a box in the empty
          space beside the globe, so the readout never blocks the sphere or the
          corner controls. */}
      {calloutVisible && leader && (
        <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full" aria-hidden>
          <line
            x1={leader.x}
            y1={leader.y}
            x2={anchorX}
            y2={anchorY}
            stroke="#1be7c8"
            strokeWidth={1}
            strokeOpacity={0.7}
            strokeDasharray="3 3"
          />
          <circle cx={leader.x} cy={leader.y} r={3.5} fill="#1be7c8" />
          <circle cx={leader.x} cy={leader.y} r={6.5} fill="#1be7c8" opacity={0.25} />
          <circle cx={anchorX} cy={anchorY} r={2.5} fill="#1be7c8" />
        </svg>
      )}
      {calloutVisible && hover && (
        <div
          className="pointer-events-none absolute z-20 rounded-xl border border-emerald-400/30 bg-[#0b0f17]/95 px-3.5 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          style={{ left: boxLeft, top: boxTop, width: BOX_W }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{hover.flag}</span>
            <p className="truncate text-sm font-semibold text-zinc-100">{hover.name}</p>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">Incidents</span>
            <span className="font-mono text-base text-emerald-300">
              {hover.count > 0 ? formatNumber(hover.count) : "—"}
            </span>
          </div>
        </div>
      )}

      {/* Top-hotspot readout card. */}
      {hotspots[0] && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 w-[210px] rounded-2xl border border-zinc-700/80 bg-[#080b12]/90 p-3.5 backdrop-blur-xl">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-xl">{getCountryFlag(hotspots[0].code || hotspots[0].name, countByCode[hotspots[0].code]?.flag)}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-100">{hotspots[0].name}</p>
              <p className="text-[11px] font-mono text-zinc-500">Top open-country pressure</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-1 text-[11px]">
            <span className="text-zinc-500">Incident volume</span>
            <span className="font-mono text-red-300">{formatNumber(hotspots[0].count)}</span>
          </div>
          <div className="flex items-center justify-between py-1 text-[11px]">
            <span className="text-zinc-500">View</span>
            <span className="font-mono text-zinc-100">{mode.toUpperCase()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
