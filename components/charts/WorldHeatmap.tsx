"use client";

import { useState, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import type { CountByCategory } from "@/lib/api";
import { getCountryFlag, formatNumber } from "@/lib/utils";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ISO 3166-1 numeric to alpha-2 mapping for matching
const NUMERIC_TO_ALPHA2: Record<string, string> = {
  "004": "AF", "008": "AL", "012": "DZ", "020": "AD", "024": "AO",
  "032": "AR", "036": "AU", "040": "AT", "050": "BD", "056": "BE",
  "076": "BR", "100": "BG", "124": "CA", "152": "CL", "156": "CN",
  "170": "CO", "191": "HR", "196": "CY", "203": "CZ", "208": "DK",
  "218": "EC", "818": "EG", "233": "EE", "246": "FI", "250": "FR",
  "276": "DE", "300": "GR", "344": "HK", "348": "HU", "352": "IS",
  "356": "IN", "360": "ID", "364": "IR", "368": "IQ", "372": "IE",
  "376": "IL", "380": "IT", "392": "JP", "400": "JO", "404": "KE",
  "410": "KR", "414": "KW", "428": "LV", "440": "LT", "442": "LU",
  "458": "MY", "470": "MT", "484": "MX", "504": "MA", "528": "NL",
  "554": "NZ", "566": "NG", "578": "NO", "586": "PK", "604": "PE",
  "608": "PH", "616": "PL", "620": "PT", "634": "QA", "642": "RO",
  "643": "RU", "682": "SA", "702": "SG", "703": "SK", "705": "SI",
  "710": "ZA", "724": "ES", "752": "SE", "756": "CH", "158": "TW",
  "764": "TH", "792": "TR", "804": "UA", "784": "AE", "826": "GB",
  "840": "US", "704": "VN", "862": "VE",
};

// Country name to ISO alpha-2
const NAME_TO_CODE: Record<string, string> = {
  "United States": "US", "United Kingdom": "GB", "Canada": "CA",
  "Australia": "AU", "Germany": "DE", "France": "FR", "Italy": "IT",
  "Spain": "ES", "Netherlands": "NL", "Belgium": "BE", "Austria": "AT",
  "Switzerland": "CH", "Sweden": "SE", "Norway": "NO", "Denmark": "DK",
  "Finland": "FI", "Poland": "PL", "Czech Republic": "CZ", "Ireland": "IE",
  "Portugal": "PT", "Greece": "GR", "Hungary": "HU", "Romania": "RO",
  "Bulgaria": "BG", "Croatia": "HR", "Slovakia": "SK", "Slovenia": "SI",
  "Lithuania": "LT", "Latvia": "LV", "Estonia": "EE", "Luxembourg": "LU",
  "Malta": "MT", "Cyprus": "CY", "Iceland": "IS", "Japan": "JP",
  "China": "CN", "India": "IN", "South Korea": "KR", "Singapore": "SG",
  "Malaysia": "MY", "Thailand": "TH", "Philippines": "PH", "Indonesia": "ID",
  "Vietnam": "VN", "New Zealand": "NZ", "Brazil": "BR", "Mexico": "MX",
  "Argentina": "AR", "Chile": "CL", "Colombia": "CO", "Peru": "PE",
  "South Africa": "ZA", "Egypt": "EG", "Nigeria": "NG", "Kenya": "KE",
  "Israel": "IL", "United Arab Emirates": "AE", "Saudi Arabia": "SA",
  "Turkey": "TR", "Russia": "RU", "Ukraine": "UA", "Pakistan": "PK",
  "Bangladesh": "BD", "Taiwan": "TW", "Hong Kong": "HK", "Iran": "IR",
  "Iraq": "IQ",
};

interface WorldHeatmapProps {
  data: CountByCategory[];
  onCountryClick?: (country: string) => void;
}

export function WorldHeatmap({ data, onCountryClick }: WorldHeatmapProps) {
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);

  // Build lookup: ISO alpha-2 code -> incident count
  const countByCode = useMemo(() => {
    const map: Record<string, { count: number; name: string }> = {};
    data.forEach((item) => {
      // Try country_code first, then lookup by name
      const code = item.country_code || NAME_TO_CODE[item.category];
      if (code) {
        map[code] = { count: item.count, name: item.category };
      }
    });
    return map;
  }, [data]);

  const maxCount = useMemo(
    () => Math.max(...data.map((d) => d.count), 1),
    [data]
  );

  function getColor(count: number): string {
    if (count === 0) return "#1a1a2e";
    const intensity = Math.pow(count / maxCount, 0.4); // Power scale for better distribution
    // Dark blue -> cyan -> bright cyan gradient
    const r = Math.round(6 + intensity * 0);
    const g = Math.round(20 + intensity * 162);
    const b = Math.round(40 + intensity * 172);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function getStrokeColor(count: number): string {
    return count > 0 ? "rgba(6, 182, 212, 0.4)" : "rgba(255,255,255,0.05)";
  }

  return (
    <div className="bg-[#0c0c18] border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium mb-0.5">
            Global Threat Map
          </p>
          <h3 className="text-sm font-semibold text-zinc-200">Education Sector — Incident Heatmap</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: "#1a1a2e" }} />
            <span>0</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: getColor(maxCount * 0.25) }} />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: getColor(maxCount * 0.5) }} />
            <span>Med</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: getColor(maxCount) }} />
            <span>High</span>
          </div>
        </div>
      </div>

      <div className="relative h-[380px]">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 130,
            center: [10, 20],
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup zoom={1} minZoom={1} maxZoom={5}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const numericId = geo.id || geo.properties?.["ISO_A3_EH"];
                  const alpha2 =
                    NUMERIC_TO_ALPHA2[numericId] ||
                    geo.properties?.["ISO_A2"] ||
                    "";
                  const info = countByCode[alpha2];
                  const count = info?.count || 0;
                  const countryName =
                    info?.name || geo.properties?.name || "Unknown";

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={getColor(count)}
                      stroke={getStrokeColor(count)}
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: {
                          outline: "none",
                          fill: count > 0 ? "#06b6d4" : "#2a2a4e",
                          stroke: "#06b6d4",
                          strokeWidth: 1,
                          cursor: count > 0 ? "pointer" : "default",
                        },
                        pressed: { outline: "none" },
                      }}
                      onMouseEnter={(evt) => {
                        const label = count > 0
                          ? `${getCountryFlag(alpha2)} ${countryName}: ${count} incident${count !== 1 ? "s" : ""}`
                          : `${countryName}: No incidents`;
                        setTooltipContent(label);
                        setTooltipPosition({
                          x: evt.clientX,
                          y: evt.clientY,
                        });
                        setShowTooltip(true);
                      }}
                      onMouseLeave={() => {
                        setShowTooltip(false);
                      }}
                      onClick={() => {
                        if (count > 0 && onCountryClick) {
                          onCountryClick(countryName);
                        }
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {showTooltip && (
          <div
            className="fixed z-50 px-3 py-2 text-sm rounded-lg border pointer-events-none"
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

      {/* Top countries bar */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {data.slice(0, 8).map((item) => (
          <button
            key={item.category}
            onClick={() => onCountryClick?.(item.category)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors text-left"
          >
            <span className="text-lg">
              {getCountryFlag(item.category, item.flag_emoji)}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-muted-foreground block truncate">
                {item.category}
              </span>
              <span className="text-sm font-semibold">{formatNumber(item.count)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
