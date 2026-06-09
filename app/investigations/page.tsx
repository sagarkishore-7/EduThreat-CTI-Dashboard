"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getThreatActors } from "@/lib/api";
import { GraphSkeleton } from "@/components/ui/Skeleton";
import { Card, CardHead, CardBody } from "@/components/ui/Card";
import { formatNumber, getCountryFlag } from "@/lib/utils";
import { Share2 } from "lucide-react";
import type { KGNode, KGLink } from "@/components/charts/KnowledgeGraph";

const KnowledgeGraph = dynamic(
  () => import("@/components/charts/KnowledgeGraph").then((m) => m.KnowledgeGraph),
  { ssr: false },
);

export default function InvestigationsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["threat-actors", 14], queryFn: () => getThreatActors(14) });
  const [selected, setSelected] = useState<string | null>(null);

  const graph = useMemo(() => {
    const actors = (data?.threat_actors ?? []).filter((a) => a.name && a.name.toLowerCase() !== "unknown").slice(0, 12);
    const nodeMap = new Map<string, KGNode>();
    const links: KGLink[] = [];
    const add = (id: string, label: string, type: KGNode["type"], val: number) => {
      if (!nodeMap.has(id)) nodeMap.set(id, { id, label, type, val });
    };
    for (const a of actors) {
      add(a.name, a.name, "actor", Math.min(28, 12 + a.incident_count));
      for (const c of (a.countries_targeted || []).slice(0, 4)) {
        if (!c) continue;
        add(c, c, "country", 8);
        links.push({ source: a.name, target: c });
      }
      for (const fam of (a.ransomware_families || []).slice(0, 3)) {
        if (!fam) continue;
        add(`${fam} (family)`, fam, "family", 7);
        links.push({ source: a.name, target: `${fam} (family)` });
      }
    }
    return { nodes: Array.from(nodeMap.values()), links };
  }, [data]);

  if (isLoading) return <GraphSkeleton />;

  const actors = (data?.threat_actors ?? []).slice(0, 12);
  const selectedActor = actors.find((a) => a.name === selected);

  return (
    <div className="animate-fade-in space-y-3.5">
      <Card>
        <CardHead
          title="Investigation Canvas"
          sub="Actor → geography → ransomware-family relationship graph from the canonical set"
          accentDot="pulse"
        />
        <CardBody className="p-0">
          <div className="grid xl:grid-cols-[1fr_320px]">
            <div className="h-[520px] border-b border-zinc-800/70 xl:border-b-0 xl:border-r">
              {graph.nodes.length > 0 ? (
                <KnowledgeGraph
                  nodes={graph.nodes}
                  links={graph.links}
                  height={520}
                  highlightId={selected}
                  onSelect={(id) => {
                    // Only actors have an inspector; ignore country/family clicks.
                    const node = graph.nodes.find((n) => n.id === id);
                    setSelected(node?.type === "actor" ? id : null);
                  }}
                />
              ) : (
                <div className="grid h-full place-items-center text-sm text-zinc-600">No relationship data available.</div>
              )}
            </div>

            <div className="p-3.5">
              {selectedActor ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Inspector</p>
                  <h3 className="mt-1 text-lg font-semibold text-zinc-100">{selectedActor.name}</h3>
                  <div className="mt-3 space-y-2 text-[12px]">
                    <Row label="Incidents" value={formatNumber(selectedActor.incident_count)} />
                    <Row label="Countries" value={formatNumber(selectedActor.countries_targeted.length)} />
                    <Row label="Families" value={formatNumber(selectedActor.ransomware_families.filter(Boolean).length)} />
                  </div>
                  <div className="mt-3">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Targeted geography</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedActor.countries_targeted.slice(0, 8).map((c) => (
                        <span key={c} className="pill pill-brand">
                          {getCountryFlag(c)} {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/incidents?search=${encodeURIComponent(selectedActor.name)}`}
                    className="ops-chip ops-chip-brand mt-4 inline-flex"
                  >
                    View incidents →
                  </Link>
                </div>
              ) : (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <Share2 className="mx-auto mb-2 h-8 w-8 text-zinc-700" />
                    <p className="text-[12px] text-zinc-500">Select an actor node to inspect its targeting and pivots.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHead title="Tracked Actors" sub={`${formatNumber(data?.total ?? 0)} attributed groups in the canonical set`} />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
          <table className="ops-table text-[12px]">
            <thead>
              <tr>
                <th>Actor</th>
                <th className="text-right">Incidents</th>
                <th className="text-right">Countries</th>
                <th>Families</th>
              </tr>
            </thead>
            <tbody>
              {actors.map((a) => (
                <tr key={a.name} className="cursor-pointer" onClick={() => setSelected(a.name)}>
                  <td className="font-medium text-zinc-100">{a.name}</td>
                  <td className="text-right font-mono text-red-300">{formatNumber(a.incident_count)}</td>
                  <td className="text-right font-mono text-emerald-300">{formatNumber(a.countries_targeted.length)}</td>
                  <td className="text-zinc-500">{a.ransomware_families.filter(Boolean).slice(0, 3).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1.5">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono text-zinc-200">{value}</span>
    </div>
  );
}
