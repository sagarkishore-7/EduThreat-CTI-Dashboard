"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getThreatActors, getCampaigns } from "@/lib/api";
import { GraphSkeleton } from "@/components/ui/Skeleton";
import { Card, CardHead, CardBody } from "@/components/ui/Card";
import { formatNumber, getCountryFlag } from "@/lib/utils";
import { ENTITY_STYLE, type KGNode, type KGLink } from "@/components/charts/KnowledgeGraph";

const KnowledgeGraph = dynamic(
  () => import("@/components/charts/KnowledgeGraph").then((m) => m.KnowledgeGraph),
  { ssr: false },
);

type EntityFilter = "actor" | "family" | "country" | "campaign";
const ALL_FILTERS: EntityFilter[] = ["actor", "family", "country", "campaign"];

export default function IntelGraphPage() {
  const actorsQuery = useQuery({ queryKey: ["intel-actors", 30], queryFn: () => getThreatActors(30) });
  const campaignsQuery = useQuery({ queryKey: ["intel-campaigns", 40], queryFn: () => getCampaigns(40) });

  const [enabled, setEnabled] = useState<Set<EntityFilter>>(new Set(ALL_FILTERS));
  const [minIncidents, setMinIncidents] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);

  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, KGNode>();
    const links: KGLink[] = [];
    const want = (t: EntityFilter) => enabled.has(t);
    const add = (id: string, label: string, type: KGNode["type"], val: number) => {
      const existing = nodeMap.get(id);
      if (existing) existing.val = Math.max(existing.val ?? 1, val);
      else nodeMap.set(id, { id, label, type, val });
    };
    const link = (a: string, b: string) => {
      if (nodeMap.has(a) && nodeMap.has(b)) links.push({ source: a, target: b });
    };

    // Threat actors and their families / countries.
    for (const a of actorsQuery.data?.threat_actors ?? []) {
      if (!a.name || a.name.toLowerCase() === "unknown") continue;
      if (a.incident_count < minIncidents) continue;
      if (want("actor")) add(`actor:${a.name}`, a.name, "actor", Math.min(30, 10 + a.incident_count));
      if (want("family")) {
        for (const fam of (a.ransomware_families || []).filter(Boolean).slice(0, 4)) {
          add(`family:${fam}`, fam, "family", 7);
          if (want("actor")) link(`actor:${a.name}`, `family:${fam}`);
        }
      }
      if (want("country")) {
        for (const c of (a.countries_targeted || []).filter(Boolean).slice(0, 5)) {
          add(`country:${c}`, c, "country", 6);
          if (want("actor")) link(`actor:${a.name}`, `country:${c}`);
        }
      }
    }

    // Campaigns linked to their actors.
    if (want("campaign")) {
      for (const c of campaignsQuery.data?.items ?? []) {
        if (c.member_count < minIncidents) continue;
        const cid = `campaign:${c.campaign_id}`;
        add(cid, c.campaign_name, "campaign", Math.min(28, 8 + c.member_count));
        for (const actor of (c.actors || []).filter(Boolean)) {
          if (want("actor")) {
            add(`actor:${actor}`, actor, "actor", 10);
            link(cid, `actor:${actor}`);
          }
        }
        for (const cve of (c.cves || []).filter(Boolean).slice(0, 3)) {
          add(`cve:${cve}`, cve, "cve_or_product", 5);
          link(cid, `cve:${cve}`);
        }
      }
    }

    return { nodes: Array.from(nodeMap.values()), links };
  }, [actorsQuery.data, campaignsQuery.data, enabled, minIncidents]);

  if (actorsQuery.isLoading || campaignsQuery.isLoading) return <GraphSkeleton header={false} />;

  const selectedNode = nodes.find((n) => n.id === selected);

  return (
    <div className="animate-fade-in space-y-3.5">
      <Card>
        <CardHead
          title="Threat Intelligence Graph"
          sub="Cross-entity knowledge graph — actors, ransomware families, targeted geographies and campaigns from the canonical corpus"
          accentDot="pulse"
        />
        <CardBody className="space-y-3 p-0">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800/70 px-4 py-2.5">
            <div className="flex flex-wrap gap-1.5">
              {ALL_FILTERS.map((t) => {
                const on = enabled.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setEnabled((prev) => {
                        const next = new Set(prev);
                        next.has(t) ? next.delete(t) : next.add(t);
                        return next.size === 0 ? prev : next;
                      })
                    }
                    className={`pill ${on ? "" : "opacity-40"}`}
                    style={{ borderColor: ENTITY_STYLE[t]?.color, color: on ? ENTITY_STYLE[t]?.color : undefined }}
                  >
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: ENTITY_STYLE[t]?.color }} />
                    {ENTITY_STYLE[t]?.label ?? t}
                  </button>
                );
              })}
            </div>
            <label className="ml-auto flex items-center gap-2 text-[11px] text-zinc-400">
              Min incidents: <span className="font-mono text-zinc-200">{minIncidents}</span>
              <input
                type="range"
                min={1}
                max={10}
                value={minIncidents}
                onChange={(e) => setMinIncidents(Number(e.target.value))}
                className="accent-emerald-400"
              />
            </label>
          </div>

          <div className="grid xl:grid-cols-[1fr_300px]">
            <div className="min-h-[560px] border-b border-zinc-800/70 xl:border-b-0 xl:border-r">
              {nodes.length > 0 ? (
                <KnowledgeGraph
                  nodes={nodes}
                  links={links}
                  height={560}
                  highlightId={selected}
                  onSelect={setSelected}
                />
              ) : (
                <div className="grid h-[560px] place-items-center text-sm text-zinc-600">No entities match the current filters.</div>
              )}
            </div>

            {/* Detail drawer */}
            <div className="p-4">
              {selectedNode ? (
                <div className="animate-fade-in">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                    {ENTITY_STYLE[selectedNode.type]?.label ?? selectedNode.type}
                  </p>
                  <h3 className="mt-1 flex items-center gap-2 text-lg font-semibold text-zinc-100">
                    {selectedNode.type === "country" && getCountryFlag(selectedNode.label)}
                    {selectedNode.label}
                  </h3>
                  <div className="mt-3 space-y-1.5 text-[12px] text-zinc-400">
                    <p>
                      Connected to{" "}
                      <span className="font-mono text-zinc-200">
                        {links.filter((l) => l.source === selectedNode.id || l.target === selectedNode.id).length}
                      </span>{" "}
                      entities
                    </p>
                  </div>
                  {selectedNode.type === "actor" && (
                    <Link
                      href={`/incidents?search=${encodeURIComponent(selectedNode.label ?? "")}`}
                      className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-300 hover:underline"
                    >
                      View incidents →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid h-full place-items-center text-center text-[12px] text-zinc-600">
                  Click any node to inspect its connections.
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
