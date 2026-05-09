"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getThreatActors } from "@/lib/api";
import { PageHeader, PageSkeleton } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { formatDate, getCountryFlag } from "@/lib/utils";
import {
  Crosshair,
  Globe2,
  Lock,
  Target,
  Users,
} from "lucide-react";

export default function ThreatActorIntelligencePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["threat-actors-v2"],
    queryFn: () => getThreatActors(30),
  });

  if (isLoading) return <PageSkeleton rows={4} />;

  const actors = data?.threat_actors || [];
  const leadActor = actors[0];

  const countryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const actor of actors) {
      for (const country of actor.countries_targeted) {
        counts.set(country, (counts.get(country) || 0) + actor.incident_count);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [actors]);

  const familyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const actor of actors) {
      for (const family of actor.ransomware_families) {
        counts.set(family, (counts.get(family) || 0) + actor.incident_count);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [actors]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Users}
        label="Threat Actor Intelligence"
        title="Threat Actor Intelligence"
        description={`${data?.total || 0} actor profiles derived from canonical incident attribution and source lineage`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard title="Tracked Actors" value={data?.total || 0} icon={Users} variant="primary" />
        <StatCard title="Most Active" value={leadActor?.name || "N/A"} icon={Target} variant="danger" />
        <StatCard
          title="Countries Targeted"
          value={data?.countries_targeted_total || 0}
          icon={Globe2}
          variant="warning"
        />
        <StatCard
          title="Actor Incidents"
          value={data?.total_incidents || 0}
          icon={Crosshair}
          variant="purple"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-xl border border-zinc-800 bg-[#0d0d1a] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="section-label mb-1">Actor Profiles</p>
              <h2 className="text-lg font-semibold text-zinc-100">Top Attributed Groups</h2>
            </div>
            <p className="text-sm text-zinc-500">Showing {actors.length} profiles</p>
          </div>
          <div className="space-y-3">
            {actors.map((actor) => (
              <div key={actor.name} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-zinc-100">{actor.name}</h3>
                      <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400">
                        {actor.incident_count} incidents
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      First seen {formatDate(actor.first_seen || "")} · Last seen {formatDate(actor.last_seen || "")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {actor.countries_targeted.map((country) => (
                        <span
                          key={`${actor.name}-${country}`}
                          className="rounded-full border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300"
                        >
                          {getCountryFlag(country)} {country}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="w-full shrink-0 lg:w-72">
                    <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-600">
                      Linked Families
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {actor.ransomware_families.length > 0 ? (
                        actor.ransomware_families.map((family) => (
                          <span
                            key={`${actor.name}-${family}`}
                            className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] text-red-300"
                          >
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

        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-[#0d0d1a] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="section-label mb-1">Geographic Pressure</p>
                <h3 className="text-lg font-semibold text-zinc-100">Most Targeted Countries</h3>
              </div>
              <Globe2 className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="space-y-2">
              {countryCounts.map(([country, count]) => (
                <div
                  key={country}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
                >
                  <span className="text-sm text-zinc-200">
                    {getCountryFlag(country)} {country}
                  </span>
                  <span className="font-mono text-cyan-400">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#0d0d1a] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="section-label mb-1">Family Associations</p>
                <h3 className="text-lg font-semibold text-zinc-100">Ransomware Overlap</h3>
              </div>
              <Lock className="h-5 w-5 text-red-400" />
            </div>
            <div className="space-y-2">
              {familyCounts.map(([family, count]) => (
                <div
                  key={family}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
                >
                  <span className="text-sm text-zinc-200">{family}</span>
                  <span className="font-mono text-red-400">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
