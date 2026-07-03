"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  getIntelGraph,
  getInvestigationVictims,
  type InvestigationRootType,
} from "@/lib/api";
import { GraphSkeleton } from "@/components/ui/Skeleton";
import { Card, CardHead, CardBody } from "@/components/ui/Card";
import { formatNumber, getCountryFlag } from "@/lib/utils";
import { entityColor, entityIcon, entityLabel } from "@/lib/entity-style";
import type { KGNode, KGLink } from "@/components/charts/KnowledgeGraph";
import { X } from "lucide-react";

const KnowledgeGraph = dynamic(
  () => import("@/components/charts/KnowledgeGraph").then((m) => m.KnowledgeGraph),
  { ssr: false },
);

// The four node tiers, largest to smallest, for the legend.
const TIERS: { type: string; hint: string }[] = [
  { type: "country", hint: "largest" },
  { type: "actor", hint: "" },
  { type: "cve", hint: "" },
  { type: "platform", hint: "smallest" },
];

export default function IntelGraphPage() {
  // Density thresholds — default 1 (the complete graph); raise to thin the long tail.
  const [minActor, setMinActor] = useState(1);
  const [minPlatform, setMinPlatform] = useState(1);
  const [includeCves, setIncludeCves] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isolate, setIsolate] = useState(false);

  const { data: graph, isLoading, isError } = useQuery({
    queryKey: ["intel-graph", minActor, minPlatform, includeCves],
    queryFn: () =>
      getIntelGraph({
        min_actor_incidents: minActor,
        min_platform_incidents: minPlatform,
        include_cves: includeCves,
      }),
  });

  const selectedNode = graph?.nodes.find((n) => n.id === selectedId) ?? null;
  const { data: victims, isFetching: victimsLoading } = useQuery({
    queryKey: ["intel-node-victims", selectedNode?.type, selectedNode?.label],
    queryFn: () =>
      getInvestigationVictims(
        (selectedNode!.type === "vendor" ? "platform" : selectedNode!.type) as InvestigationRootType,
        selectedNode!.label,
      ),
    enabled: Boolean(selectedNode),
  });

  const kg = useMemo(() => {
    const nodes: KGNode[] = (graph?.nodes ?? []).map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      val: n.size, // backend already encodes the country>actor>cve>platform size tier
      meta: { ...n.metadata },
    }));
    const links: KGLink[] = (graph?.edges ?? []).map((e) => ({
      source: e.source,
      target: e.target,
      relation: e.relation,
    }));
    return { nodes, links };
  }, [graph]);

  const tc = graph?.meta.type_counts ?? {};

  return (
    <div className="animate-fade-in space-y-3.5">
      <Card>
        <CardHead
          title="Threat Intelligence Graph"
          sub="The complete education-sector threat landscape — countries, the actors that span them, the CVEs they exploit, and the platforms hit"
          accentDot="pulse"
        />
        <CardBody className="p-0">
          <div className="grid lg:grid-cols-[236px_1fr_312px]">
            {/* ── Left rail: legend + density ─────────────────────────────── */}
            <div className="space-y-4 border-b border-zinc-800/70 p-3.5 lg:border-b-0 lg:border-r">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Node hierarchy
                </p>
                <div className="space-y-1.5">
                  {TIERS.map((t, i) => (
                    <div key={t.type} className="flex items-center gap-2">
                      <span
                        className="inline-block shrink-0 rounded-full"
                        style={{
                          width: 18 - i * 3,
                          height: 18 - i * 3,
                          background: entityColor(t.type),
                        }}
                      />
                      <span className="text-[12px] text-zinc-300">{entityLabel(t.type)}</span>
                      {t.hint && <span className="text-[10px] text-zinc-600">{t.hint}</span>}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] leading-tight text-zinc-600">
                  Size scales with incident volume within each tier. An actor spanning several
                  countries links them together.
                </p>
                <p className="mt-2 rounded-md bg-zinc-900/50 px-2 py-1.5 text-[10px] leading-tight text-zinc-500">
                  Click any node to trace its <span className="text-zinc-300">full trail</span> —
                  a country lights all its actors, their CVEs, and the platforms hit. Toggle
                  <span className="text-zinc-300"> Isolate</span> to follow that trail alone.
                </p>
                <label className="mt-2 flex items-center gap-2 text-[12px] text-zinc-300">
                  <input
                    type="checkbox"
                    checked={isolate}
                    onChange={(e) => setIsolate(e.target.checked)}
                    className="accent-red-500"
                  />
                  Isolate selected trail
                </label>
              </div>

              <div className="space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Density
                </p>
                <Slider label="Min. actor incidents" value={minActor} onChange={setMinActor} />
                <Slider label="Min. platform incidents" value={minPlatform} onChange={setMinPlatform} />
                <label className="flex items-center gap-2 pt-0.5 text-[12px] text-zinc-300">
                  <input
                    type="checkbox"
                    checked={includeCves}
                    onChange={(e) => setIncludeCves(e.target.checked)}
                    className="accent-red-500"
                  />
                  Show CVEs
                </label>
                <p className="text-[10px] leading-tight text-zinc-600">
                  Both at 1 shows the complete graph. Raise to thin one-off actors and noisy
                  vendor strings.
                </p>
              </div>

              {graph && (
                <div className="rounded-lg border border-zinc-800/70 bg-zinc-900/40 p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Graph</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-zinc-100">
                    {formatNumber(graph.meta.node_count)}
                  </p>
                  <p className="text-[11px] text-zinc-500">nodes · {formatNumber(graph.meta.edge_count)} links</p>
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                    {TIERS.map((t) =>
                      tc[t.type] ? (
                        <span
                          key={t.type}
                          className="rounded px-1.5 py-0.5"
                          style={{ color: entityColor(t.type), background: `${entityColor(t.type)}1a` }}
                        >
                          {tc[t.type]} {entityLabel(t.type).toLowerCase()}
                        </span>
                      ) : null,
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Center: the whole-dataset graph ─────────────────────────── */}
            <div className="border-b border-zinc-800/70 p-2 lg:border-b-0 lg:border-r">
              {isLoading ? (
                <GraphSkeleton header={false} filters={false} />
              ) : isError || !graph ? (
                <div className="grid h-[560px] place-items-center text-sm text-zinc-600">
                  Could not load the intelligence graph.
                </div>
              ) : (
                <KnowledgeGraph
                  nodes={kg.nodes}
                  links={kg.links}
                  height={560}
                  layout="auto"
                  minimalLabels
                  highlightMode="trail"
                  isolateActive={isolate}
                  highlightId={selectedId}
                  onSelect={setSelectedId}
                />
              )}
            </div>

            {/* ── Right drawer: node detail + drill-down ──────────────────── */}
            <div className="p-3.5">
              {selectedNode ? (
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      {(() => {
                        const NodeIcon = entityIcon(selectedNode.type);
                        return (
                          <span
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                            style={{ color: entityColor(selectedNode.type), background: `${entityColor(selectedNode.type)}1a` }}
                          >
                            <NodeIcon className="h-3 w-3" /> {entityLabel(selectedNode.type)}
                          </span>
                        );
                      })()}
                      <h3 className="mt-1.5 text-base font-semibold leading-tight text-zinc-100">
                        {selectedNode.type === "country" ? `${getCountryFlag(selectedNode.label)} ` : ""}
                        {selectedNode.label}
                      </h3>
                    </div>
                    <button onClick={() => setSelectedId(null)} className="text-zinc-600 hover:text-zinc-300">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                    <Stat label="Incidents" value={formatNumber(Number(selectedNode.metadata?.incident_count ?? 0))} />
                    {typeof selectedNode.metadata?.country_count === "number" && (
                      <Stat label="Countries" value={formatNumber(selectedNode.metadata.country_count as number)} />
                    )}
                  </div>

                  <div className="mt-3.5">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                      Incidents{" "}
                      <span className="font-mono text-zinc-300">
                        {victims ? `(${formatNumber(victims.count)})` : ""}
                      </span>
                    </p>
                    {victimsLoading ? (
                      <p className="text-[12px] text-zinc-600">Loading…</p>
                    ) : victims && victims.institutions.length > 0 ? (
                      <ul className="max-h-[380px] space-y-1 overflow-y-auto pr-1">
                        {victims.institutions.slice(0, 200).map((v) => (
                          <li key={v.canonical_incident_id}>
                            <Link
                              href={`/incidents?search=${encodeURIComponent(v.victim_name ?? "")}`}
                              className="block rounded-md border border-zinc-800/70 bg-zinc-900/40 px-2 py-1.5 transition hover:border-zinc-700 hover:bg-zinc-800/50"
                            >
                              <span className="text-[12px] font-medium text-zinc-100">
                                {v.country ? `${getCountryFlag(v.country)} ` : ""}
                                {v.victim_name || "Unnamed"}
                              </span>
                              <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-zinc-500">
                                {v.incident_date && <span>{v.incident_date.slice(0, 10)}</span>}
                                {v.institution_type && <span>· {v.institution_type}</span>}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[12px] text-zinc-600">No incidents found.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <p className="text-[12px] text-zinc-500">
                      Click any node to highlight its connections and list the incidents behind it.
                    </p>
                    {graph && (
                      <p className="mt-2 text-[11px] text-zinc-600">
                        {formatNumber(graph.meta.total_incidents)} incidents across the corpus.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-zinc-400">{label}</span>
        <span className="font-mono text-zinc-300">≥ {value}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-red-500"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md bg-zinc-900/50 px-2 py-1">
      <span className="text-zinc-500">{label} </span>
      <span className="font-mono text-zinc-200">{value}</span>
    </span>
  );
}
