"use client";

import { useQuery } from "@tanstack/react-query";
import { getMitreAnalytics } from "@/lib/api";
import { ChartsSkeleton } from "@/components/ui/Skeleton";
import { Card, CardHead, CardBody } from "@/components/ui/Card";
import { MitreStrip } from "@/components/ui/MitreStrip";
import { BarList } from "@/components/ui/BarList";
import { formatNumber, formatPercent } from "@/lib/utils";
import { AlertTriangle, Target } from "lucide-react";

const TACTIC_ORDER = [
  "Reconnaissance",
  "Resource Development",
  "Initial Access",
  "Execution",
  "Persistence",
  "Privilege Escalation",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Lateral Movement",
  "Collection",
  "Command And Control",
  "Exfiltration",
  "Impact",
];

const SHORT: Record<string, string> = {
  "resource development": "Resource Dev",
  "privilege escalation": "Priv Esc",
  "credential access": "Cred Access",
  "lateral movement": "Lateral Move",
  "command and control": "Command & Control",
};

function shortTactic(name: string) {
  return SHORT[name.toLowerCase()] || name;
}

function cellColor(intensity: number): string {
  // 0..1 → translucent mint
  const a = 0.06 + intensity * 0.5;
  return `color-mix(in srgb, var(--brand) ${Math.round(a * 100)}%, transparent)`;
}

export default function MitrePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["mitre-full", 40, 6],
    queryFn: () => getMitreAnalytics({ technique_limit: 40, per_tactic_limit: 6 }),
    refetchInterval: 120_000,
  });

  if (isLoading) return <ChartsSkeleton />;
  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="ops-panel max-w-lg px-6 py-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h2 className="mb-2 text-lg font-semibold text-zinc-100">MITRE coverage unavailable</h2>
          <p className="text-sm text-zinc-500">The ATT&CK analytics endpoint could not be reached.</p>
        </div>
      </div>
    );
  }

  const ov = data.overview;
  const tacticStrip = data.tactics.map((t) => ({
    tactic: t.tactic,
    count: t.incident_count,
    techniqueCount: t.technique_count,
  }));

  // Build the matrix: ordered tactics → their top techniques
  const byTactic = new Map(data.top_techniques_by_tactic.map((g) => [g.tactic.toLowerCase(), g.techniques]));
  const tacticCount = new Map(data.tactics.map((t) => [t.tactic.toLowerCase(), t.incident_count]));
  const orderedTactics = [...data.tactics]
    .sort((a, b) => {
      const ra = TACTIC_ORDER.findIndex((t) => t.toLowerCase() === a.tactic.toLowerCase());
      const rb = TACTIC_ORDER.findIndex((t) => t.toLowerCase() === b.tactic.toLowerCase());
      return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb);
    })
    .map((t) => t.tactic);
  const techMax = Math.max(...data.techniques.map((t) => t.count), 1);

  const topTechniques = data.techniques.slice(0, 10).map((t) => ({
    name: `${t.technique_id} · ${t.technique_name}`,
    value: t.count,
    meta: t.tactic,
    color: "var(--pulse)",
  }));

  return (
    <div className="animate-fade-in space-y-3.5">
      {/* Coverage KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Coverage", value: formatPercent(ov.incidents_with_mitre_share), sub: `${formatNumber(ov.incidents_with_mitre)} of ${formatNumber(ov.total_incidents)} incidents` },
          { label: "Technique Observations", value: formatNumber(ov.technique_count_total), sub: "mapped across the open set" },
          { label: "Unique Techniques", value: formatNumber(ov.unique_technique_count), sub: "distinct ATT&CK techniques" },
          { label: "Tactics Observed", value: formatNumber(ov.unique_tactic_count), sub: "of 14 enterprise tactics" },
        ].map((k) => (
          <Card key={k.label}>
            <CardBody className="py-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{k.label}</div>
              <div className="kpi-val mt-2 text-2xl" style={{ ["--c" as string]: "var(--pulse)" }}>{k.value}</div>
              <div className="mt-1 text-[11px] text-zinc-500">{k.sub}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Observed tactics heat strip */}
      <Card>
        <CardHead title="Observed Tactics" sub="Incident frequency per ATT&CK tactic (kill-chain order)" actions={<span className="ops-chip ops-chip-pulse"><Target className="h-3 w-3" /> {formatNumber(ov.unique_technique_count)} techniques</span>} />
        <CardBody>
          <MitreStrip tactics={tacticStrip} />
        </CardBody>
      </Card>

      {/* The matrix */}
      <Card>
        <CardHead title="ATT&CK Matrix · Education Sector" sub="Top techniques per tactic · cell intensity = observation count" />
        <CardBody className="overflow-x-auto">
          <div className="flex gap-1.5" style={{ minWidth: orderedTactics.length * 132 }}>
            {orderedTactics.map((tactic) => {
              const techs = byTactic.get(tactic.toLowerCase()) ?? [];
              return (
                <div key={tactic} className="flex w-[128px] shrink-0 flex-col gap-1">
                  <div className="rounded-t bg-[#0a0c14] px-2 py-1.5">
                    <div className="text-[9.5px] font-semibold uppercase leading-tight tracking-[0.04em] text-zinc-300">
                      {shortTactic(tactic)}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-emerald-400">
                      {formatNumber(tacticCount.get(tactic.toLowerCase()) ?? 0)}
                    </div>
                  </div>
                  {techs.length === 0 && (
                    <div className="rounded border border-zinc-800/60 bg-zinc-900/30 px-2 py-2 text-[9px] text-zinc-600">
                      —
                    </div>
                  )}
                  {techs.map((tech) => (
                    <div
                      key={tech.technique_id}
                      className="rounded border border-zinc-800/60 px-2 py-1.5"
                      style={{ background: cellColor(tech.count / techMax) }}
                      title={`${tech.technique_id} ${tech.technique_name} — ${formatNumber(tech.count)} obs`}
                    >
                      <div className="font-mono text-[9px] text-zinc-400">{tech.technique_id}</div>
                      <div className="truncate text-[10px] font-medium text-zinc-100">{tech.technique_name}</div>
                      <div className="font-mono text-[9px] text-emerald-300">{formatNumber(tech.count)}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Top techniques */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHead title="Most Observed Techniques" sub="Highest-frequency techniques across all tactics" />
          <CardBody className="py-2">
            <BarList items={topTechniques} color="var(--pulse)" />
          </CardBody>
        </Card>
        <Card>
          <CardHead title="Tactic Coverage Detail" sub="Incidents and distinct techniques per tactic" />
          <CardBody className="p-0">
            <div className="overflow-x-auto">
            <table className="ops-table text-[12px]">
              <thead>
                <tr>
                  <th>Tactic</th>
                  <th className="text-right">Incidents</th>
                  <th className="text-right">Share</th>
                  <th className="text-right">Techniques</th>
                </tr>
              </thead>
              <tbody>
                {data.tactics.map((t) => (
                  <tr key={t.tactic}>
                    <td className="font-medium text-zinc-200">{shortTactic(t.tactic)}</td>
                    <td className="text-right font-mono text-zinc-300">{formatNumber(t.incident_count)}</td>
                    <td className="text-right font-mono text-zinc-500">{formatPercent(t.incident_percentage)}</td>
                    <td className="text-right font-mono text-emerald-300">{formatNumber(t.technique_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
