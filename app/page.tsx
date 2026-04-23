"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getDashboard, getAttackFlow, getCountryAnalytics } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { RecentIncidentsList } from "@/components/RecentIncidentsList";
import { formatCurrency } from "@/lib/utils";
import {
  GraduationCap,
  Globe2,
  Users,
  AlertTriangle,
  Database,
  Lock,
  Clock,
  DollarSign,
  Target,
  Layers,
  Shield,
  Activity,
} from "lucide-react";

const IncidentTimeChart = dynamic(
  () => import("@/components/charts/IncidentTimeChart").then((m) => m.IncidentTimeChart),
  { ssr: false }
);
const AttackTypeChart = dynamic(
  () => import("@/components/charts/AttackTypeChart").then((m) => m.AttackTypeChart),
  { ssr: false }
);
const WorldHeatmap = dynamic(
  () => import("@/components/charts/WorldHeatmap").then((m) => m.WorldHeatmap),
  { ssr: false }
);
const RansomwareChart = dynamic(
  () => import("@/components/charts/RansomwareChart").then((m) => m.RansomwareChart),
  { ssr: false }
);
const AttackFlowChart = dynamic(
  () => import("@/components/charts/AttackFlowChart").then((m) => m.AttackFlowChart),
  { ssr: false }
);

export default function DashboardPage() {
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    refetchInterval: 60000,
  });

  const { data: attackFlow } = useQuery({
    queryKey: ["attack-flow"],
    queryFn: getAttackFlow,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all countries for the full-coverage choropleth (same as global map page)
  const { data: allCountriesData } = useQuery({
    queryKey: ["countries-dashboard-map"],
    queryFn: () => getCountryAnalytics(200),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-base font-semibold mb-1 text-zinc-200">Connection Failed</h2>
          <p className="text-sm text-zinc-600">Unable to reach the API.</p>
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

  const enrichmentPct = stats.total_incidents > 0
    ? Math.round((stats.education_incidents / stats.total_incidents) * 100)
    : 0;

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Status Banner ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-zinc-800 bg-[#0c0c18] text-[11px] font-mono overflow-x-auto">
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-400 font-bold">OPERATIONAL</span>
        </span>
        <span className="text-zinc-700">│</span>
        <span className="text-zinc-500 shrink-0">
          <span className="text-zinc-400">{stats.education_incidents.toLocaleString()}</span> verified incidents
        </span>
        <span className="text-zinc-700">│</span>
        <span className="text-zinc-500 shrink-0">
          <span className="text-zinc-400">{stats.countries_affected}</span> nations
        </span>
        <span className="text-zinc-700">│</span>
        <span className="text-zinc-500 shrink-0">
          <span className="text-zinc-400">{stats.unique_threat_actors}</span> threat actors
        </span>
        <span className="text-zinc-700">│</span>
        <span className="text-zinc-500 shrink-0">
          <span className="text-zinc-400">{stats.data_sources}</span> intel sources
        </span>
        <span className="text-zinc-700 hidden sm:inline">│</span>
        <span className="text-zinc-600 shrink-0 hidden sm:inline">
          updated {new Date(stats.last_updated).toLocaleTimeString()}
        </span>
      </div>

      {/* ── Primary Stat Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Education Institutions Affected"
          value={stats.education_incidents}
          description="Confirmed education-sector incidents"
          icon={GraduationCap}
          variant="primary"
          href="/incidents?enriched_only=true"
        />
        <StatCard
          title="Ransomware Attacks"
          value={stats.incidents_with_ransomware}
          description={`${stats.unique_ransomware_families} unique families identified`}
          icon={Lock}
          variant="danger"
          href="/incidents?attack_category=ransomware"
        />
        <StatCard
          title="Data Breaches"
          value={stats.incidents_with_data_breach}
          description="Confirmed data exfiltration events"
          icon={Database}
          variant="warning"
          href="/incidents?data_breached=true"
        />
        <StatCard
          title="Countries Affected"
          value={stats.countries_affected}
          description="Nations with edu-sector incidents"
          icon={Globe2}
          variant="success"
          href="/map"
        />
      </div>

      {/* ── Secondary Metrics ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Threat Actors"
          value={stats.unique_threat_actors}
          description="Identified groups"
          icon={Users}
          variant="danger"
          size="compact"
          href="/incidents"
        />
        <StatCard
          title="MITRE Mapped"
          value={stats.incidents_with_mitre}
          description="With ATT&CK attribution"
          icon={Target}
          variant="purple"
          size="compact"
          href="/incidents?enriched_only=true"
        />
        <StatCard
          title={stats.total_financial_impact > 0 ? "Financial Impact" : "Avg Recovery"}
          value={
            stats.total_financial_impact > 0
              ? formatCurrency(stats.total_financial_impact)
              : stats.avg_recovery_days
              ? `${stats.avg_recovery_days}d`
              : "N/A"
          }
          description={stats.total_financial_impact > 0 ? "Estimated total loss" : "Mean days to recover"}
          icon={stats.total_financial_impact > 0 ? DollarSign : Clock}
          variant={stats.total_financial_impact > 0 ? "pink" : "warning"}
          size="compact"
        />
        <StatCard
          title="Intel Sources"
          value={stats.data_sources}
          description="Active data feeds"
          icon={Layers}
          variant="success"
          size="compact"
        />
      </div>

      {/* ── World Heatmap + Attack Flow ───────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Map takes 2/3 */}
        <div className="xl:col-span-2">
          <WorldHeatmap
            data={allCountriesData?.data ?? incidents_by_country}
            onCountryClick={(country) =>
              router.push(`/incidents?country=${encodeURIComponent(country)}`)
            }
          />
        </div>

        {/* Attack Flow Sankey — 1/3 */}
        <div className="bg-[#0c0c18] border border-zinc-800 rounded-lg p-4">
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium mb-0.5">
              Attack Intelligence
            </p>
            <h3 className="text-sm font-semibold text-zinc-200">Attack Flow</h3>
            <p className="text-[10px] text-zinc-600 mt-0.5">
              Vector → Category → Actor
            </p>
          </div>
          <div className="h-[360px]">
            {attackFlow ? (
              <AttackFlowChart data={attackFlow} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                  <Activity className="w-8 h-8 text-zinc-700 mx-auto" />
                  <p className="text-xs text-zinc-600">Loading attack flow…</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Timeline — full width ─────────────────────────────────── */}
      <IncidentTimeChart data={incidents_over_time} />

      {/* ── Bottom Row: Attack Types | Ransomware | Feed ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AttackTypeChart data={incidents_by_attack_type} />
        <RansomwareChart data={incidents_by_ransomware} />
        <div className="min-h-[360px] flex flex-col">
          <RecentIncidentsList incidents={recent_incidents} />
        </div>
      </div>

      {/* ── Coverage Meter ────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-4 py-3 rounded-lg border border-zinc-800 bg-[#0c0c18]">
        <Shield className="w-4 h-4 text-cyan-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] uppercase tracking-widest text-zinc-500 font-medium">
              Intelligence Coverage
            </span>
            <span className="text-[11px] font-mono text-cyan-400 font-bold">
              {enrichmentPct}%
            </span>
          </div>
          <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-1000"
              style={{ width: `${enrichmentPct}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-600 mt-1 font-mono">
            {stats.education_incidents.toLocaleString()} education incidents /{" "}
            {stats.total_incidents.toLocaleString()} total collected
          </p>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 rounded-lg bg-zinc-900 border border-zinc-800" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-zinc-900 border border-zinc-800" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-zinc-900 border border-zinc-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 h-[460px] rounded-lg bg-zinc-900 border border-zinc-800" />
        <div className="h-[460px] rounded-lg bg-zinc-900 border border-zinc-800" />
      </div>
      <div className="h-[320px] rounded-lg bg-zinc-900 border border-zinc-800" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-[360px] rounded-lg bg-zinc-900 border border-zinc-800" />
        ))}
      </div>
      <div className="h-14 rounded-lg bg-zinc-900 border border-zinc-800" />
    </div>
  );
}
