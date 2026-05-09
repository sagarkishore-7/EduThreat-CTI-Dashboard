"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCountryAnalytics, getDashboard, getThreatActors } from "@/lib/api";
import { RecentIncidentsList } from "@/components/RecentIncidentsList";
import { StatCard } from "@/components/StatCard";
import { formatDate } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  Database,
  Globe2,
  GraduationCap,
  Layers,
  Lock,
  Shield,
  Users,
} from "lucide-react";

const IncidentTimeChart = dynamic(
  () => import("@/components/charts/IncidentTimeChart").then((m) => m.IncidentTimeChart),
  { ssr: false },
);
const AttackTypeChart = dynamic(
  () => import("@/components/charts/AttackTypeChart").then((m) => m.AttackTypeChart),
  { ssr: false },
);
const WorldHeatmap = dynamic(
  () => import("@/components/charts/WorldHeatmap").then((m) => m.WorldHeatmap),
  { ssr: false },
);
const RansomwareChart = dynamic(
  () => import("@/components/charts/RansomwareChart").then((m) => m.RansomwareChart),
  { ssr: false },
);

export default function DashboardPage() {
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    refetchInterval: 60_000,
  });
  const { data: countries } = useQuery({
    queryKey: ["countries-dashboard-map"],
    queryFn: () => getCountryAnalytics(200),
    staleTime: 5 * 60_000,
  });
  const { data: actors } = useQuery({
    queryKey: ["dashboard-threat-actors"],
    queryFn: () => getThreatActors(6),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <h2 className="mb-1 text-base font-semibold text-zinc-200">Connection Failed</h2>
          <p className="text-sm text-zinc-600">Unable to reach the v2 API.</p>
        </div>
      </div>
    );
  }

  const {
    stats,
    incidents_by_country,
    incidents_by_attack_type,
    incidents_by_ransomware,
    incidents_over_time,
    recent_incidents,
  } = data;

  const actorItems = actors?.threat_actors || [];
  const mapData = countries?.data || incidents_by_country;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-[#0c0c18] px-4 py-2.5 text-[11px] font-mono">
        <div className="flex min-w-max items-center gap-3">
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="font-bold text-emerald-400">V2 CANONICAL LIVE</span>
          </span>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-500">
            <span className="text-zinc-300">{stats.education_incidents.toLocaleString()}</span> verified incidents
          </span>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-500">
            <span className="text-zinc-300">{stats.countries_affected}</span> countries
          </span>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-500">
            <span className="text-zinc-300">{stats.unique_threat_actors}</span> actors
          </span>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-500">
            updated <span className="text-zinc-300">{new Date(stats.last_updated).toLocaleTimeString()}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Education Incidents"
          value={stats.education_incidents}
          description="Canonical incidents retained in the dataset"
          icon={GraduationCap}
          variant="primary"
          href="/incidents"
        />
        <StatCard
          title="Ransomware"
          value={stats.incidents_with_ransomware}
          description={`${stats.unique_ransomware_families} families tracked`}
          icon={Lock}
          variant="danger"
          href="/ransomware"
        />
        <StatCard
          title="Data Breaches"
          value={stats.incidents_with_data_breach}
          description="Incidents with breach or exfiltration indicators"
          icon={Database}
          variant="warning"
          href="/analytics"
        />
        <StatCard
          title="Countries"
          value={stats.countries_affected}
          description="Geographic spread across the education sector"
          icon={Globe2}
          variant="success"
          href="/map"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          title="Threat Actors"
          value={stats.unique_threat_actors}
          icon={Users}
          variant="purple"
          size="compact"
          href="/threat-actors"
        />
        <StatCard
          title="Enriched"
          value={stats.enriched_incidents}
          icon={Shield}
          variant="success"
          size="compact"
          href="/incidents"
        />
        <StatCard
          title="Pending Review"
          value={stats.unenriched_incidents}
          icon={Activity}
          variant="warning"
          size="compact"
          href="/admin"
        />
        <StatCard
          title="Feeds"
          value={stats.data_sources}
          icon={Layers}
          variant="default"
          size="compact"
          href="/admin"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <WorldHeatmap
            data={mapData}
            onCountryClick={(country) =>
              router.push(`/incidents?country=${encodeURIComponent(country)}`)
            }
          />
        </div>

        <div className="rounded-lg border border-zinc-800 bg-[#0c0c18] p-4">
          <div className="mb-3">
            <p className="mb-0.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              Threat Actor Focus
            </p>
            <h3 className="text-sm font-semibold text-zinc-200">Top Active Groups</h3>
            <p className="mt-0.5 text-[10px] text-zinc-600">
              Canonical actor profiles built from the new Postgres read path
            </p>
          </div>
          <div className="space-y-2">
            {actorItems.length > 0 ? (
              actorItems.map((actor, index) => (
                <Link
                  key={actor.name}
                  href={`/incidents?search=${encodeURIComponent(actor.name)}`}
                  className="flex items-start justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 transition-colors hover:border-cyan-500/30 hover:bg-zinc-800/50"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600">#{index + 1}</p>
                    <p className="truncate text-sm font-medium text-zinc-100">{actor.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {actor.countries_targeted.slice(0, 3).join(", ") || "Multi-region targeting"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-semibold text-cyan-400">
                      {actor.incident_count}
                    </p>
                    <p className="text-[10px] text-zinc-600">
                      {formatDate(actor.last_seen || actor.first_seen || stats.last_updated)}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex h-[320px] items-center justify-center text-sm text-zinc-600">
                Threat actor profiles are still loading.
              </div>
            )}
          </div>
        </div>
      </div>

      <IncidentTimeChart data={incidents_over_time} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AttackTypeChart data={incidents_by_attack_type} />
        <RansomwareChart data={incidents_by_ransomware} />
        <div className="min-h-[360px]">
          <RecentIncidentsList incidents={recent_incidents} />
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 rounded-lg border border-zinc-800 bg-zinc-900" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-lg border border-zinc-800 bg-zinc-900" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg border border-zinc-800 bg-zinc-900" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="h-[420px] rounded-lg border border-zinc-800 bg-zinc-900 xl:col-span-2" />
        <div className="h-[420px] rounded-lg border border-zinc-800 bg-zinc-900" />
      </div>
      <div className="h-[360px] rounded-lg border border-zinc-800 bg-zinc-900" />
    </div>
  );
}
