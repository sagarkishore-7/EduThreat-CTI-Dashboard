"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader, PageSkeleton } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { getAnalyticsBreakdowns, getDashboard } from "@/lib/api";
import { formatDate, formatNumber, formatPercent, getCountryFlag } from "@/lib/utils";
import {
  BarChart3,
  Database,
  Globe2,
  Lock,
  ShieldAlert,
  Users,
} from "lucide-react";

export default function ImpactAnalyticsPage() {
  const { data: dashboard, isLoading: loadingDashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });
  const { data: breakdowns, isLoading: loadingBreakdowns } = useQuery({
    queryKey: ["analytics-breakdowns-v2"],
    queryFn: () => getAnalyticsBreakdowns(),
  });

  if (loadingDashboard || loadingBreakdowns || !dashboard) {
    return <PageSkeleton rows={4} />;
  }

  const intelligence = dashboard.intelligence_summary;

  const topCountries = intelligence.victimology.top_countries.slice(0, 8);
  const segments = intelligence.victimology.institution_segments.slice(0, 6);
  const attackClusters = intelligence.tradecraft.attack_clusters.slice(0, 6);
  const attackVectors = intelligence.tradecraft.attack_vectors.slice(0, 8);
  const topActors = intelligence.attribution.top_threat_actors.slice(0, 6);
  const topFamilies = intelligence.attribution.top_ransomware_families.slice(0, 6);
  const recordEvents = intelligence.exposure.largest_record_events.slice(0, 6);
  const rawInstitutionTypes = breakdowns?.institution_types || [];
  const rawSeverities = breakdowns?.severities || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={BarChart3}
        label="Analyst Workbook"
        title="Victimology, Tradecraft, and Exposure"
        description={`Professional CTI views shaped around fields that are materially populated in the current canonical dataset as of ${formatDate(dashboard.stats.last_updated)}.`}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <WorkbookMetric
            label="Known Attack Vectors"
            value={formatPercent(intelligence.coverage.attack_vector_known_share)}
            detail={`${formatNumber(intelligence.coverage.attack_vector_known_count)} canonicals with named vectors`}
          />
          <WorkbookMetric
            label="Known Attribution"
            value={formatPercent(intelligence.coverage.attribution_known_share)}
            detail={`${formatNumber(intelligence.coverage.attribution_known_count)} canonicals with named actors`}
          />
          <WorkbookMetric
            label="Known Record Events"
            value={formatPercent(intelligence.coverage.record_loss_known_share)}
            detail={`${formatNumber(intelligence.coverage.record_loss_known_count)} canonicals with exact record counts`}
          />
          <WorkbookMetric
            label="Vendor / Supply Chain"
            value={formatPercent(intelligence.overview.vendor_linked_share)}
            detail={`${formatNumber(intelligence.overview.vendor_linked_count)} affected canonicals`}
          />
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard
          title="Breach-Tagged"
          value={dashboard.stats.incidents_with_data_breach}
          icon={Database}
          variant="warning"
        />
        <StatCard
          title="Ransomware Share"
          value={formatPercent(intelligence.overview.ransomware_share)}
          icon={Lock}
          variant="danger"
        />
        <StatCard
          title="Attributed Share"
          value={formatPercent(intelligence.overview.actor_attributed_share)}
          icon={Users}
          variant="purple"
        />
        <StatCard
          title="Known Records"
          value={formatNumber(intelligence.exposure.known_record_volume)}
          icon={ShieldAlert}
          variant="success"
        />
        <StatCard
          title="Countries"
          value={dashboard.stats.countries_affected}
          icon={Globe2}
          variant="primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <WorkbookPanel
          eyebrow="Victimology"
          title="Who absorbs the pressure"
          description="Macro victim segments are more stable than raw institution labels, so they are the right analyst lens first."
        >
          <div className="space-y-2">
            {segments.map((segment) => (
              <WorkbookBar
                key={segment.segment}
                label={segment.segment}
                value={`${formatNumber(segment.count)} · ${formatPercent(segment.percentage)}`}
                width={segment.percentage}
              />
            ))}
          </div>
        </WorkbookPanel>

        <WorkbookPanel
          eyebrow="Geography"
          title="Where the retained activity concentrates"
          description="Use this with the map page for deeper regional pivots."
        >
          <div className="space-y-2">
            {topCountries.map((country) => (
              <div
                key={`${country.category}-${country.country_code}`}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
              >
                <span className="text-sm text-zinc-200">
                  {getCountryFlag(country.country_code || country.category, country.flag_emoji)} {country.category}
                </span>
                <span className="font-mono text-cyan-400">{formatNumber(country.count)}</span>
              </div>
            ))}
          </div>
        </WorkbookPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <WorkbookPanel
          eyebrow="Tradecraft"
          title="How operations are delivered"
          description="Attack clusters remain the strongest public signal; named vectors are the second layer when available."
        >
          <div className="space-y-2">
            {attackClusters.map((cluster) => (
              <WorkbookBar
                key={cluster.cluster}
                label={cluster.cluster}
                value={`${formatNumber(cluster.count)} · ${formatPercent(cluster.percentage)}`}
                width={cluster.percentage}
                tone="amber"
              />
            ))}
          </div>
        </WorkbookPanel>

        <WorkbookPanel
          eyebrow="Initial Access"
          title="Named vectors that do resolve"
          description="Vector coverage is partial, so this view is intentionally limited to named signals instead of forcing unknowns into the chart."
        >
          <div className="flex flex-wrap gap-2">
            {attackVectors.map((vector) => (
              <span
                key={vector.vector}
                className="rounded-full border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-xs text-zinc-300"
              >
                {vector.vector} · {formatNumber(vector.count)}
              </span>
            ))}
          </div>
        </WorkbookPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <WorkbookPanel
          eyebrow="Attribution"
          title="Who appears most often"
          description="The named-actor set is still smaller than the overall dataset, but it is already large enough to support watchlisting."
        >
          <div className="space-y-2">
            {topActors.map((actor) => (
              <div
                key={actor.name}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-100">{actor.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {actor.countries_targeted.slice(0, 3).join(", ") || "Multi-region"} · last seen {formatDate(actor.last_seen || actor.first_seen)}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-violet-400">{formatNumber(actor.incident_count)}</span>
                </div>
              </div>
            ))}
          </div>
        </WorkbookPanel>

        <WorkbookPanel
          eyebrow="Ransomware"
          title="Families driving extortion pressure"
          description="This is the cleaner way to watch family prevalence than raw incident filters alone."
        >
          <div className="space-y-2">
            {topFamilies.map((family) => (
              <div
                key={family.category}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
              >
                <span className="text-sm text-zinc-200">{family.category}</span>
                <span className="font-mono text-red-400">
                  {formatNumber(family.count)} · {formatPercent(family.percentage)}
                </span>
              </div>
            ))}
          </div>
        </WorkbookPanel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <WorkbookPanel
          eyebrow="Exposure"
          title="Exact record-loss events"
          description="These are the best quantified exposure cases in the public canonical set right now."
        >
          <div className="space-y-2">
            {recordEvents.length > 0 ? (
              recordEvents.map((event) => (
                <div
                  key={event.incident_id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-100">{event.display_name}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatDate(event.incident_date)} · {event.country || "Unknown country"} · {event.attack_category || "Unspecified attack type"}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-emerald-400">
                      {formatNumber(event.records_affected)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-6 text-sm text-zinc-600">
                Exact record-loss counts are not populated widely enough yet for a ranked exposure table.
              </div>
            )}
          </div>
        </WorkbookPanel>

        <WorkbookPanel
          eyebrow="Raw Taxonomies"
          title="What still needs normalization"
          description="These views are useful for QA and future cleanup because they show the raw labels behind the macro analyst cuts."
        >
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-300">Institution Types</p>
              <div className="space-y-2">
                {rawInstitutionTypes.slice(0, 6).map((item) => (
                  <WorkbookBar
                    key={item.category}
                    label={item.category}
                    value={formatNumber(item.count)}
                    width={item.percentage}
                    tone="violet"
                  />
                ))}
              </div>
            </div>
            <div className="divider pt-4">
              <p className="mb-2 text-sm font-medium text-zinc-300">Severity Snapshot</p>
              <div className="space-y-2">
                {rawSeverities.length > 0 ? (
                  rawSeverities.slice(0, 6).map((item) => (
                    <WorkbookBar
                      key={item.category}
                      label={item.category}
                      value={formatNumber(item.count)}
                      width={item.percentage}
                      tone="emerald"
                    />
                  ))
                ) : (
                  <p className="text-sm text-zinc-600">
                    Severity metadata is still sparse in the public canonical layer.
                  </p>
                )}
              </div>
            </div>
          </div>
        </WorkbookPanel>
      </div>
    </div>
  );
}

function WorkbookPanel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-[#0d0d1a] p-5">
      <div className="mb-4">
        <p className="section-label mb-1">{eyebrow}</p>
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function WorkbookMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-3">
      <p className="text-[10px] uppercase tracking-widest text-zinc-600">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold text-zinc-100">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

function WorkbookBar({
  label,
  value,
  width,
  tone = "cyan",
}: {
  label: string;
  value: string;
  width: number;
  tone?: "cyan" | "amber" | "emerald" | "violet";
}) {
  const tones = {
    cyan: "from-cyan-500 to-sky-500",
    amber: "from-amber-500 to-orange-500",
    emerald: "from-emerald-500 to-teal-500",
    violet: "from-violet-500 to-fuchsia-500",
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="font-mono text-zinc-500">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tones[tone]}`}
          style={{ width: `${Math.min(Math.max(width, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}
