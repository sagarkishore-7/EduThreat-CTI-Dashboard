"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getThreatActors } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/StatCard";
import { cn, formatDate, formatNumber, getCountryFlag } from "@/lib/utils";
import {
  Crosshair,
  Globe2,
  Lock,
  Radar,
  Target,
  Users,
} from "lucide-react";

export default function ThreatActorIntelligencePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["threat-actors-v2"],
    queryFn: () => getThreatActors(30),
  });

  const actors = useMemo(() => data?.threat_actors || [], [data]);
  const leadActor = actors[0];

  const countryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const actor of actors) {
      for (const country of actor.countries_targeted) {
        counts.set(country, (counts.get(country) || 0) + actor.incident_count);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [actors]);

  const familyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const actor of actors) {
      for (const family of actor.ransomware_families) {
        counts.set(family, (counts.get(family) || 0) + actor.incident_count);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [actors]);

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Users}
        label="Threat Actors"
        title="Attribution watchlist"
        description={`${data?.total || 0} actor profiles derived from canonical attribution, merged source disclosures, and ransomware family overlap.`}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <HeaderMetric
            label="Tracked actors"
            value={formatNumber(data?.total || 0)}
            detail={`${formatNumber(data?.total_incidents || 0)} attributed incidents`}
          />
          <HeaderMetric
            label="Lead actor"
            value={leadActor?.name || "n/a"}
            detail={leadActor ? `${formatNumber(leadActor.incident_count)} incidents` : "No attributed actor yet"}
          />
          <HeaderMetric
            label="Countries targeted"
            value={formatNumber(data?.countries_targeted_total || 0)}
            detail="Distinct geographies touched by named actors"
          />
          <HeaderMetric
            label="Family overlap"
            value={formatNumber(familyCounts.length)}
            detail="Unique ransomware families linked to actors"
          />
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard title="Actor Watchlist" value={data?.total || 0} icon={Users} variant="primary" />
        <StatCard title="Most Active" value={leadActor?.name || "N/A"} icon={Target} variant="danger" />
        <StatCard title="Geographies" value={data?.countries_targeted_total || 0} icon={Globe2} variant="success" />
        <StatCard title="Attributed Rows" value={data?.total_incidents || 0} icon={Crosshair} variant="purple" />
      </div>

      {leadActor && (
        <div className="ops-shell overflow-hidden">
          <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="border-b border-zinc-800/70 px-6 py-5 xl:border-b-0 xl:border-r">
              <p className="section-label mb-2">Lead Profile</p>
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-400 to-amber-400 text-lg font-black text-[#08110f]">
                  {leadActor.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold text-zinc-100">{leadActor.name}</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    First seen {formatDate(leadActor.first_seen || "")} · Last seen {formatDate(leadActor.last_seen || "")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {leadActor.countries_targeted.slice(0, 6).map((country) => (
                      <span key={`${leadActor.name}-${country}`} className="ops-chip">
                        {getCountryFlag(country)} {country}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-3 px-6 py-5 sm:grid-cols-2">
              <FocusMetric label="Attributed incidents" value={formatNumber(leadActor.incident_count)} tone="threat" />
              <FocusMetric label="Country footprint" value={formatNumber(leadActor.countries_targeted.length)} tone="brand" />
              <FocusMetric label="Linked families" value={formatNumber(leadActor.ransomware_families.length)} tone="pulse" />
              <FocusMetric label="Campaign persistence" value={leadActor.last_seen ? "active" : "historic"} tone="warn" />
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="ops-panel">
          <div className="ops-panel-head">
            <div>
              <p className="ops-subtle">Actor profiles</p>
              <h2 className="ops-title">Named groups in the current corpus</h2>
            </div>
          </div>
          <div className="space-y-3 px-5 py-4">
            {actors.map((actor) => (
              <div key={actor.name} className="rounded-2xl border border-zinc-800/70 bg-zinc-900/35 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base font-semibold text-zinc-100">{actor.name}</p>
                      <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] font-mono text-red-300">
                        {formatNumber(actor.incident_count)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      First seen {formatDate(actor.first_seen || "")} · Last seen {formatDate(actor.last_seen || "")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {actor.countries_targeted.map((country) => (
                        <span key={`${actor.name}-${country}`} className="ops-chip">
                          {getCountryFlag(country)} {country}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="w-full lg:w-72">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">Linked families</p>
                    <div className="flex flex-wrap gap-2">
                      {actor.ransomware_families.length > 0 ? (
                        actor.ransomware_families.map((family) => (
                          <span key={`${actor.name}-${family}`} className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2 py-1 text-[10px] text-indigo-300">
                            {family}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-600">No ransomware family attached</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <SidePanel
            eyebrow="Geographic pressure"
            title="Most targeted countries"
            icon={<Globe2 className="h-4 w-4 text-emerald-300" />}
            rows={countryCounts.map(([country, count]) => ({
              label: `${getCountryFlag(country)} ${country}`,
              value: formatNumber(count),
            }))}
            tone="brand"
          />

          <SidePanel
            eyebrow="Family overlap"
            title="Ransomware associations"
            icon={<Lock className="h-4 w-4 text-red-300" />}
            rows={familyCounts.map(([family, count]) => ({
              label: family,
              value: formatNumber(count),
            }))}
            tone="danger"
          />

          <div className="ops-panel">
            <div className="ops-panel-head">
              <div>
                <p className="ops-subtle">Attribution note</p>
                <h2 className="ops-title">How to read this page</h2>
              </div>
              <Radar className="h-4 w-4 text-indigo-300" />
            </div>
            <div className="ops-panel-body text-sm text-zinc-400">
              These profiles reflect current retained actor naming in the public canonical layer. Treat them as analyst watchlist entities rather than formal intelligence-community attribution.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/30 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-2 truncate font-mono text-2xl text-zinc-100">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

function FocusMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "threat" | "brand" | "pulse" | "warn";
}) {
  const toneClass = {
    threat: "text-red-300",
    brand: "text-emerald-300",
    pulse: "text-indigo-300",
    warn: "text-amber-300",
  }[tone];
  return (
    <div className="rounded-2xl border border-zinc-800/70 bg-[#0b0f17]/95 p-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className={cn("mt-2 font-mono text-2xl", toneClass)}>{value}</p>
    </div>
  );
}

function SidePanel({
  eyebrow,
  title,
  icon,
  rows,
  tone,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  rows: Array<{ label: string; value: string }>;
  tone: "brand" | "danger";
}) {
  return (
    <div className="ops-panel">
      <div className="ops-panel-head">
        <div>
          <p className="ops-subtle">{eyebrow}</p>
          <h2 className="ops-title">{title}</h2>
        </div>
        {icon}
      </div>
      <div className="ops-panel-body space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/70 bg-zinc-900/35 px-3 py-2">
            <span className="text-sm text-zinc-200">{row.label}</span>
            <span className={cn("font-mono text-sm", tone === "brand" ? "text-emerald-300" : "text-red-300")}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
