"use client";

import type { CountByCategory } from "@/lib/api";
import { cn, formatNumber } from "@/lib/utils";

type TelemetryMode = "choropleth" | "dots" | "arcs";

type Point = {
  x: number;
  y: number;
  label?: string;
  tone?: "brand" | "pulse" | "warn" | "threat" | "info";
};

const COUNTRY_POINTS: Record<string, Point> = {
  US: { x: 230, y: 220 },
  CA: { x: 215, y: 170 },
  MX: { x: 195, y: 265 },
  BR: { x: 320, y: 380 },
  GB: { x: 468, y: 194 },
  IE: { x: 446, y: 202 },
  FR: { x: 490, y: 226 },
  DE: { x: 516, y: 205 },
  NL: { x: 503, y: 196 },
  IT: { x: 530, y: 248 },
  ES: { x: 470, y: 246 },
  AU: { x: 846, y: 416 },
  NZ: { x: 905, y: 445 },
  JP: { x: 853, y: 212 },
  KR: { x: 818, y: 215 },
  CN: { x: 758, y: 245 },
  IN: { x: 673, y: 290 },
  SG: { x: 740, y: 326 },
  ZA: { x: 575, y: 445 },
  RU: { x: 645, y: 140 },
  UA: { x: 582, y: 178 },
  IR: { x: 620, y: 248 },
  IL: { x: 585, y: 251 },
  PK: { x: 650, y: 266 },
};

const ORIGIN_POINTS: Array<{ code: string; label: string; tone: Point["tone"] }> = [
  { code: "RU", label: "RU", tone: "threat" },
  { code: "CN", label: "CN", tone: "pulse" },
  { code: "IR", label: "IR", tone: "warn" },
  { code: "KP", label: "KP", tone: "warn" },
];

const toneClasses: Record<NonNullable<Point["tone"]>, string> = {
  brand: "var(--primary)",
  pulse: "var(--accent)",
  warn: "#ff8c42",
  threat: "#ff4757",
  info: "#4dbcff",
};

function pathForArc(from: Point, to: Point) {
  const dx = Math.abs(to.x - from.x);
  const curveLift = Math.max(55, Math.min(160, dx * 0.22));
  const midX = (from.x + to.x) / 2;
  const midY = Math.min(from.y, to.y) - curveLift;
  return `M ${from.x},${from.y} Q ${midX},${midY} ${to.x},${to.y}`;
}

function toneColor(tone: Point["tone"] = "brand") {
  return toneClasses[tone];
}

export function AttackTelemetryOverlay({
  countries,
  mode,
}: {
  countries: CountByCategory[];
  mode: TelemetryMode;
}) {
  const mappedTargets = countries
    .map((country) => {
      const code = country.country_code?.toUpperCase() || "";
      const point = COUNTRY_POINTS[code];
      if (!point) return null;
      return {
        ...country,
        code,
        point,
      };
    })
    .filter(Boolean)
    .slice(0, 8) as Array<CountByCategory & { code: string; point: Point }>;

  const maxCount = Math.max(...mappedTargets.map((item) => item.count), 1);
  const targets = mappedTargets.map((item, index) => ({
    ...item,
    radius: 6 + (item.count / maxCount) * 14,
    tone: (index === 0 ? "threat" : index < 3 ? "warn" : "info") as Point["tone"],
  }));

  const arcs = ORIGIN_POINTS.flatMap((origin, originIndex) => {
    const originPoint = COUNTRY_POINTS[origin.code];
    if (!originPoint) return [];
    return targets.slice(0, 3).map((target, targetIndex) => ({
      id: `${origin.code}-${target.code}`,
      origin,
      from: originPoint,
      to: target.point,
      path: pathForArc(originPoint, target.point),
      duration: 3.1 + originIndex * 0.5 + targetIndex * 0.6,
    }));
  });

  return (
    <svg
      viewBox="0 0 1000 520"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      <defs>
        <radialGradient id="telemetryPulseThreat">
          <stop offset="0%" stopColor="rgba(255,71,87,0.42)" />
          <stop offset="100%" stopColor="rgba(255,71,87,0)" />
        </radialGradient>
        <radialGradient id="telemetryPulseInfo">
          <stop offset="0%" stopColor="rgba(77,188,255,0.3)" />
          <stop offset="100%" stopColor="rgba(77,188,255,0)" />
        </radialGradient>
      </defs>

      <g opacity={mode === "dots" ? 0.35 : 0.14}>
        {[110, 250, 390].map((y) => (
          <line key={`lat-${y}`} x1="0" y1={y} x2="1000" y2={y} stroke="rgba(129,140,248,0.18)" strokeDasharray="3 6" />
        ))}
        {[220, 460, 700, 860].map((x) => (
          <line key={`lon-${x}`} x1={x} y1="0" x2={x} y2="520" stroke="rgba(129,140,248,0.15)" strokeDasharray="3 6" />
        ))}
      </g>

      {mode !== "dots" && (
        <g opacity={mode === "arcs" ? 0.95 : 0.72}>
          {arcs.map((arc, index) => (
            <g key={arc.id}>
              <path
                d={arc.path}
                fill="none"
                stroke={toneColor(arc.origin.tone)}
                strokeWidth="1.2"
                strokeDasharray="4 6"
                opacity={0.24 + (index % 3) * 0.08}
              />
              <circle r="2.8" fill={toneColor(arc.origin.tone)} opacity="0.96">
                <animateMotion dur={`${arc.duration}s`} repeatCount="indefinite" path={arc.path} />
              </circle>
            </g>
          ))}
        </g>
      )}

      {targets.map((target, index) => (
        <g
          key={target.code}
          className={cn(
            "transition-opacity duration-300",
            mode === "arcs" && index > 4 ? "opacity-50" : "opacity-100",
          )}
        >
          <circle
            cx={target.point.x}
            cy={target.point.y}
            r={target.radius * 1.8}
            fill={index === 0 ? "url(#telemetryPulseThreat)" : "url(#telemetryPulseInfo)"}
          />
          <circle
            cx={target.point.x}
            cy={target.point.y}
            r={target.radius}
            fill={toneColor(target.tone)}
            opacity={0.72}
          />
          <circle cx={target.point.x} cy={target.point.y} r={Math.max(3, target.radius * 0.25)} fill="#f8fafc" />
          {mode !== "arcs" && (
            <circle cx={target.point.x} cy={target.point.y} r={target.radius} fill="none" stroke={toneColor(target.tone)} opacity="0.72">
              <animate attributeName="r" from={target.radius.toString()} to={(target.radius * 1.85).toString()} dur={`${2.2 + index * 0.35}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.65" to="0" dur={`${2.2 + index * 0.35}s`} repeatCount="indefinite" />
            </circle>
          )}
          <text
            x={target.point.x}
            y={target.point.y - target.radius - 10}
            fill={toneColor(target.tone)}
            fontSize="12"
            fontFamily="var(--font-geist-mono), monospace"
            fontWeight="700"
            textAnchor="middle"
          >
            {target.code} · {formatNumber(target.count)}
          </text>
        </g>
      ))}

      {mode !== "dots" &&
        ORIGIN_POINTS.map((origin) => {
          const point = COUNTRY_POINTS[origin.code];
          if (!point) return null;
          return (
            <g key={origin.code}>
              <circle cx={point.x} cy={point.y} r="5.5" fill={toneColor(origin.tone)} opacity="0.9" />
              <circle cx={point.x} cy={point.y} r="5.5" fill="none" stroke={toneColor(origin.tone)} opacity="0.85">
                <animate attributeName="r" from="5.5" to="17" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.85" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
              <text
                x={point.x + 12}
                y={point.y - 8}
                fill={toneColor(origin.tone)}
                fontSize="11"
                fontFamily="var(--font-geist-mono), monospace"
                fontWeight="700"
              >
                {origin.label}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
