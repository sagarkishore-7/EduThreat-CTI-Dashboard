"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageSkeleton } from "@/components/PageHeader";
import { getDashboard, getKpiTrends, getMitreAnalytics } from "@/lib/api";
import { formatNumber, formatAttackCategory } from "@/lib/utils";
import { OpsStrip } from "@/components/ui/OpsStrip";
import { KpiTile } from "@/components/ui/KpiTile";
import { MotionList, MotionItem } from "@/components/motion/Motion";
import { Card, CardHead, CardBody } from "@/components/ui/Card";
import { MitreStrip } from "@/components/ui/MitreStrip";
import { LiveFeed } from "@/components/ui/LiveFeed";
import { BarList } from "@/components/ui/BarList";
import { GraduationCap, Lock, Database, Users, ArrowRight, AlertTriangle } from "lucide-react";

const WorldHeatmap = dynamic(() => import("@/components/charts/WorldHeatmap").then((m) => m.WorldHeatmap), {
  ssr: false,
});

// recharts is heavy; defer it so KPI tiles (lightweight SVG sparklines) and the
// map/feed paint first.
const TrendChart = dynamic(() => import("@/components/ui/TrendChart").then((m) => m.TrendChart), {
  ssr: false,
  loading: () => <div className="h-[188px] animate-pulse rounded bg-zinc-900/40" />,
});

export default function DashboardPage() {
  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard, refetchInterval: 60_000 });
  const kpiQuery = useQuery({ queryKey: ["kpi-trends", 12], queryFn: () => getKpiTrends(12), refetchInterval: 60_000 });
  const mitreQuery = useQuery({
    queryKey: ["mitre-analytics", 8, 3],
    queryFn: () => getMitreAnalytics({ technique_limit: 8, per_tactic_limit: 3 }),
    refetchInterval: 60_000,
  });

  if (dashboardQuery.isLoading) return <PageSkeleton rows={4} />;

  if (dashboardQuery.error || !dashboardQuery.data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="ops-panel max-w-lg px-6 py-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h2 className="mb-2 text-lg font-semibold text-zinc-100">Unable to load the CTI briefing</h2>
          <p className="text-sm text-zinc-500">
            The dashboard could not reach the v2 analytics API. Retry once the backend is reachable.
          </p>
        </div>
      </div>
    );
  }

  const data = dashboardQuery.data;
  const stats = data.stats;
  const intel = data.intelligence_summary;
  const kpi = kpiQuery.data;
  const mitreTactics = (mitreQuery.data?.tactics ?? []).map((t) => ({
    tactic: t.tactic,
    count: t.incident_count,
    techniqueCount: t.technique_count,
  }));

  const topActors = intel.attribution.top_threat_actors.slice(0, 6).map((a) => ({
    name: a.name,
    value: a.incident_count,
    meta: a.countries_targeted.slice(0, 3).join(" · ") || "Multi-region",
    href: `/incidents?search=${encodeURIComponent(a.name)}`,
    color: "var(--threat)",
  }));

  const attackMix = (data.incidents_by_attack_type ?? []).slice(0, 7).map((a) => ({
    name: formatAttackCategory(a.category),
    value: a.count,
    href: `/incidents?attack_category=${encodeURIComponent(a.category)}`,
    color: a.category.includes("ransomware")
      ? "var(--threat)"
      : a.category.includes("breach")
        ? "var(--warn)"
        : a.category.includes("unauthorized")
          ? "var(--pulse)"
          : "var(--info)",
  }));

  return (
    <div className="animate-fade-in space-y-3.5">
      {/* ── LIVE OPS STRIP ── */}
      <OpsStrip
        tlp="amber"
        stats={[
          { value: formatNumber(stats.education_incidents), label: "verified incidents", tone: "brand" },
          { value: formatNumber(intel.tempo.recent_90d_count), label: "last 90d", tone: "alert" },
          { value: formatNumber(stats.countries_affected), label: "nations" },
          { value: formatNumber(stats.unique_threat_actors), label: "actors tracked" },
          { value: formatNumber(intel.overview.ransomware_count), label: "ransomware" },
          { value: formatNumber(intel.overview.breach_count), label: "breaches" },
        ]}
      />

      {/* ── KPI TILES ── */}
      <MotionList className="grid grid-cols-2 gap-3 xl:grid-cols-4" stagger={0.06}>
        <MotionItem>
          <KpiTile
            label="Education Incidents"
            value={formatNumber(stats.education_incidents)}
            count={stats.education_incidents}
            icon={GraduationCap}
            accent="brand"
            trend={kpi?.incidents.values}
            deltaPct={kpi?.incidents.delta_pct}
            caption="vs prior 6mo"
            href="/incidents"
          />
        </MotionItem>
        <MotionItem>
          <KpiTile
            label="Active Ransomware"
            value={formatNumber(intel.overview.ransomware_count)}
            count={intel.overview.ransomware_count}
            icon={Lock}
            accent="threat"
            trend={kpi?.ransomware.values}
            deltaPct={kpi?.ransomware.delta_pct}
            caption={`${formatNumber(stats.unique_ransomware_families)} families`}
            href="/ransomware"
          />
        </MotionItem>
        <MotionItem>
          <KpiTile
            label="Data Breaches"
            value={formatNumber(intel.overview.breach_count)}
            count={intel.overview.breach_count}
            icon={Database}
            accent="warn"
            trend={kpi?.breaches.values}
            deltaPct={kpi?.breaches.delta_pct}
            caption={`${formatNumber(intel.exposure.known_record_events)} record events`}
            href="/analytics"
          />
        </MotionItem>
        <MotionItem>
          <KpiTile
            label="Threat Actors"
            value={formatNumber(stats.unique_threat_actors)}
            count={stats.unique_threat_actors}
            icon={Users}
            accent="pulse"
            trend={kpi?.actors.values}
            deltaPct={kpi?.actors.delta_pct}
            caption={`${formatNumber(intel.overview.actor_attributed_count)} attributed`}
            href="/threat-actors"
          />
        </MotionItem>
      </MotionList>

      {/* ── HERO: MAP + LIVE FEED ── */}
      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        <Card scanline className="flex h-[420px] flex-col">
          <CardHead
            title="Global Threat Telemetry"
            sub="Live attack arcs · click a country to filter incidents"
            actions={
              <Link href="/map" className="ops-chip ops-chip-brand">
                Geo map <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <WorldHeatmap
              data={data.incidents_by_country}
              onCountryClick={(country) => {
                window.location.href = `/incidents?country=${encodeURIComponent(country)}`;
              }}
              showHeader={false}
              showTopCountries={false}
              className="h-full border-0 bg-transparent p-0"
              mapClassName="relative h-full"
              telemetryMode="arcs"
            />
          </div>
        </Card>

        <Card className="flex h-[420px] flex-col">
          <CardHead
            title="Live Event Stream"
            sub="Most recent canonical incidents"
            accentDot="threat"
            actions={<Link href="/incidents" className="ops-chip">All →</Link>}
          />
          <LiveFeed incidents={data.recent_incidents} />
        </Card>
      </div>

      {/* ── MITRE STRIP ── */}
      <Card>
        <CardHead
          title="MITRE ATT&CK · Observed Tactics"
          sub="Education sector · cell intensity = technique frequency"
          actions={<Link href="/mitre" className="ops-chip ops-chip-pulse">Open matrix →</Link>}
        />
        <CardBody>
          <MitreStrip tactics={mitreTactics} />
        </CardBody>
      </Card>

      {/* ── TREND + ACTORS + ATTACK MIX ── */}
      <div className="grid gap-3 xl:grid-cols-[1.7fr_1fr_1fr]">
        <Card>
          <CardHead title="Incidents Over Time" sub="24-month window · monthly count" />
          <CardBody>
            <TrendChart data={data.incidents_over_time} />
          </CardBody>
        </Card>

        <Card>
          <CardHead
            title="Top Threat Actors"
            sub="By verified attribution"
            actions={<Link href="/threat-actors" className="ops-chip">All →</Link>}
          />
          <CardBody className="py-2">
            <BarList items={topActors} color="var(--threat)" />
          </CardBody>
        </Card>

        <Card>
          <CardHead title="Attack Category Mix" sub="Share of open canonical set" />
          <CardBody className="py-2">
            <BarList items={attackMix} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
