"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, PageSkeleton } from "@/components/PageHeader";
import { getCountryAnalytics, getStats, type CountByCategory } from "@/lib/api";
import { cn, formatNumber, formatPercent, getCountryFlag, getCountryRegion } from "@/lib/utils";
import {
  Crosshair,
  Download,
  Globe2,
  Layers3,
  MapPinned,
  MoveUpRight,
  Orbit,
  Radar,
} from "lucide-react";

const ThreatGlobe = dynamic(
  () => import("@/components/charts/ThreatGlobe").then((m) => m.ThreatGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center text-sm text-zinc-600">Loading globe…</div>
    ),
  },
);

type Mode = "choropleth" | "dots" | "arcs";

type CountryItem = CountByCategory & { region: string };

export default function MapPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choropleth");

  const statsQuery = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
  });

  const countryQuery = useQuery({
    queryKey: ["countries-full"],
    queryFn: () => getCountryAnalytics(200),
  });

  const stats = statsQuery.data;
  const countries = countryQuery.data?.data || [];

  const enrichedCountries = useMemo<CountryItem[]>(
    () =>
      countries.map((country) => ({
        ...country,
        // Prefer the authoritative region the API now derives from the normalized
        // country_code; fall back to the local lookup only if absent.
        region: country.region || getCountryRegion(country.category, country.country_code),
      })),
    [countries],
  );

  const groupedByRegion = useMemo(() => {
    const grouped = new Map<string, CountryItem[]>();
    for (const country of enrichedCountries) {
      const list = grouped.get(country.region) || [];
      list.push(country);
      grouped.set(country.region, list);
    }
    return Array.from(grouped.entries())
      .map(([region, items]) => ({
        region,
        total: items.reduce((sum, item) => sum + item.count, 0),
        items: items.sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.total - a.total);
  }, [enrichedCountries]);

  if (statsQuery.isLoading || countryQuery.isLoading) {
    return <PageSkeleton rows={3} />;
  }

  const topCountry = countries[0];
  const activeArcs = Math.min(Math.max(countries.length - 1, 0), 7);
  const selectedShare = stats?.education_incidents
    ? (topCountry?.count || 0) / stats.education_incidents
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Globe2}
        label="Geography"
        title="Geographic Pressure Map"
        description={`Country-level distribution of retained education-sector canonicals across ${stats?.countries_affected || 0} affected nations, with operator overlays tuned for live incident watch.`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <SegmentButton label="Choropleth" active={mode === "choropleth"} onClick={() => setMode("choropleth")} />
          <SegmentButton label="Dots" active={mode === "dots"} onClick={() => setMode("dots")} />
          <SegmentButton label="Arcs" active={mode === "arcs"} onClick={() => setMode("arcs")} />
          <Link href="/incidents" className="ops-chip ops-chip-brand ml-auto">
            Incident register
            <MoveUpRight className="h-3 w-3" />
          </Link>
          <Link href="/analytics" className="ops-chip">
            Analyst workbook
          </Link>
        </div>
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MapKpi
          icon={Radar}
          tone="brand"
          label="Total incidents"
          value={formatNumber(stats?.education_incidents || 0)}
          detail="Open education-sector canonicals"
        />
        <MapKpi
          icon={MapPinned}
          tone="threat"
          label="Countries affected"
          value={formatNumber(stats?.countries_affected || 0)}
          detail="Distinct geographies in corpus"
        />
        <MapKpi
          icon={Crosshair}
          tone="warn"
          label="Top concentration"
          value={topCountry ? formatPercent(selectedShare * 100) : "0%"}
          detail={topCountry ? `${getCountryFlag(topCountry.country_code || topCountry.category, topCountry.flag_emoji)} ${topCountry.category}` : "No geo data"}
        />
        <MapKpi
          icon={Orbit}
          tone="pulse"
          label="Active lanes"
          value={formatNumber(activeArcs)}
          detail="Projected correlation corridors"
        />
        <MapKpi
          icon={Layers3}
          tone="info"
          label="Regions"
          value={formatNumber(groupedByRegion.length)}
          detail="World regions with retained activity"
        />
      </div>

      <div className="ops-panel overflow-hidden">
        <div className="ops-panel-head">
          <div>
            <p className="ops-subtle">Global Theatre</p>
            <h2 className="ops-title">Interactive education CTI map</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="ops-chip ops-chip-info">Mode · {mode.toUpperCase()}</span>
            <span className="ops-chip">
              {formatNumber(countries.length)} mapped countries
            </span>
            <button
              type="button"
              className="ops-chip"
              onClick={() => {
                const payload = JSON.stringify(countries, null, 2);
                const blob = new Blob([payload], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = "eduthreat-country-analytics.json";
                anchor.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-3 w-3" />
              Export JSON
            </button>
          </div>
        </div>

        <div className="ops-panel-body">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0a0c14]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,216,180,0.08),transparent_62%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,216,180,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(0,216,180,0.025)_1px,transparent_1px)] bg-[size:34px_34px] opacity-60" />

            <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-zinc-800/80 bg-[#080b12]/90 p-1 backdrop-blur-xl">
                <SegmentButton compact label="EDU" active />
                <SegmentButton compact label="All sectors" active={false} />
              </div>
            </div>

            <div className="absolute right-4 top-4 z-10 hidden items-center gap-2 md:flex">
              <ControlChip label="Open incidents" onClick={() => router.push("/incidents")} />
              <ControlChip label="Reset to choropleth" onClick={() => setMode("choropleth")} />
            </div>

            <div className="relative h-[520px]">
              <ThreatGlobe
                data={countries}
                onCountryClick={(country) => router.push(`/incidents?country=${encodeURIComponent(country)}`)}
                mode={mode}
              />

              <div className="absolute bottom-4 right-4 z-10 flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-700/80 bg-[#080b12]/92 px-4 py-3 text-[11px] text-zinc-400 backdrop-blur-xl">
                <LegendItem swatch="bg-emerald-400" label="Open incident density" />
                <LegendItem swatch="bg-indigo-400" label="Projected pressure lanes" />
                <LegendItem swatch="bg-amber-400" label="Secondary hotspots" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="ops-panel">
          <div className="ops-panel-head">
            <div>
              <p className="ops-subtle">Regional Pressure</p>
              <h2 className="ops-title">Country clusters by region</h2>
            </div>
          </div>
          <div className="ops-panel-body grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groupedByRegion.map((region) => (
              <div key={region.region} className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{region.region}</p>
                    <p className="text-[11px] text-zinc-500">{region.items.length} active countries</p>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 font-mono text-[11px] text-emerald-300">
                    {formatNumber(region.total)}
                  </span>
                </div>
                <div className="space-y-2">
                  {region.items.slice(0, 6).map((country) => (
                    <button
                      key={`${region.region}-${country.category}`}
                      onClick={() => router.push(`/incidents?country=${encodeURIComponent(country.category)}`)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-800/60 bg-[#0b0f17]/90 px-3 py-2 text-left transition-colors hover:border-emerald-400/30"
                    >
                      <span className="truncate text-sm text-zinc-200">
                        {getCountryFlag(country.country_code || country.category, country.flag_emoji)} {country.category}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-400">{formatNumber(country.count)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="ops-panel">
            <div className="ops-panel-head">
              <div>
                <p className="ops-subtle">Priority Countries</p>
                <h2 className="ops-title">Immediate watchlist</h2>
              </div>
            </div>
            <div className="ops-panel-body space-y-2">
              {countries.slice(0, 8).map((country, index) => (
                <Link
                  key={country.category}
                  href={`/incidents?country=${encodeURIComponent(country.category)}`}
                  className="ops-live-row"
                >
                  <div className={cn(
                    "mt-1 h-2.5 w-2.5 rounded-full",
                    index === 0 ? "bg-red-400 shadow-[0_0_10px_rgba(255,71,87,0.9)]" : "bg-emerald-400 shadow-[0_0_10px_rgba(0,216,180,0.75)]",
                  )} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-zinc-100">
                        {getCountryFlag(country.country_code || country.category, country.flag_emoji)} {country.category}
                      </span>
                      <span className="font-mono text-emerald-300">{formatNumber(country.count)}</span>
                    </div>
                    <div className="mt-2 ops-bar-track">
                      <div className="ops-bar-fill" style={{ width: `${Math.min(country.percentage, 100)}%` }} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="ops-panel">
            <div className="ops-panel-head">
              <div>
                <p className="ops-subtle">Operational Notes</p>
                <h2 className="ops-title">How to use this map</h2>
              </div>
            </div>
            <div className="ops-panel-body space-y-3 text-sm text-zinc-400">
              <p>
                The map stays anchored on the current retained education-sector canonical set. The moving overlays are a live operator aid, while the choropleth remains the underlying quantitative truth.
              </p>
              <p>
                Use <span className="text-zinc-200">dots</span> to scan hotspot density, <span className="text-zinc-200">arcs</span> to emphasize pressure routes, and click any country to pivot directly into the filtered incident register.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SegmentButton({
  label,
  active = false,
  onClick,
  compact = false,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border transition-colors",
        compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-xs",
        active
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
          : "border-zinc-800/80 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
      )}
    >
      {label}
    </button>
  );
}

function ControlChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-zinc-700/80 bg-[#080b12]/92 px-3 py-2 text-[11px] text-zinc-300 transition-colors hover:border-emerald-400/30 hover:text-emerald-300"
    >
      {label}
    </button>
  );
}

function MapKpi({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Globe2;
  label: string;
  value: string;
  detail: string;
  tone: "brand" | "threat" | "warn" | "pulse" | "info";
}) {
  const toneClasses = {
    brand: "bg-emerald-400 text-emerald-300 bg-emerald-400/10",
    threat: "bg-red-400 text-red-300 bg-red-400/10",
    warn: "bg-amber-400 text-amber-300 bg-amber-400/10",
    pulse: "bg-indigo-400 text-indigo-300 bg-indigo-400/10",
    info: "bg-sky-400 text-sky-300 bg-sky-400/10",
  }[tone].split(" ");

  return (
    <div className="ops-kpi">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
          <p className="mt-2 font-mono text-3xl text-zinc-100">{value}</p>
        </div>
        <div className={cn("rounded-xl p-2.5", toneClasses[2])}>
          <Icon className={cn("h-4 w-4", toneClasses[1])} />
        </div>
      </div>
      <p className="text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

function LegendItem({
  swatch,
  label,
}: {
  swatch: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("h-2.5 w-2.5 rounded-full", swatch)} />
      <span>{label}</span>
    </span>
  );
}
