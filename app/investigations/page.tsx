"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  getFilters,
  getInvestigationGraph,
  getInvestigationVictims,
  type InvestigationGraphResponse,
  type InvestigationRootType,
  type InvestigationTrail,
} from "@/lib/api";
import { GraphSkeleton } from "@/components/ui/Skeleton";
import { Card, CardHead, CardBody } from "@/components/ui/Card";
import { formatNumber, getCountryFlag } from "@/lib/utils";
import { entityColor, entityIcon, entityLabel } from "@/lib/entity-style";
import type { KGNode, KGLink } from "@/components/charts/KnowledgeGraph";
import { ChevronRight, Crosshair, Search, X } from "lucide-react";

const KnowledgeGraph = dynamic(
  () => import("@/components/charts/KnowledgeGraph").then((m) => m.KnowledgeGraph),
  { ssr: false },
);

// The entities an analyst can start an investigation from. "platform" also matches
// vendors server-side, so one control covers both.
const ROOTS: { type: InvestigationRootType; label: string }[] = [
  { type: "actor", label: "Threat actor" },
  { type: "country", label: "Country" },
  { type: "platform", label: "Platform / vendor" },
  { type: "cve", label: "CVE" },
  { type: "institution", label: "Institution" },
];

// Map a selected graph node to the trail key that scopes the victim drill-down.
function trailFor(nodeType: string, label: string): InvestigationTrail {
  if (nodeType === "actor") return { actor: label };
  if (nodeType === "cve") return { cve: label };
  if (nodeType === "platform" || nodeType === "vendor") return { platform: label };
  if (nodeType === "country") return { country: label };
  if (nodeType === "institution") return { institution: label };
  return {};
}

export default function InvestigationsPage() {
  const { data: filters } = useQuery({ queryKey: ["filters"], queryFn: getFilters });

  const [rootType, setRootType] = useState<InvestigationRootType>("country");
  const [rootValue, setRootValue] = useState<string>("United States");
  const [draft, setDraft] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trail, setTrail] = useState<{ type: InvestigationRootType; value: string }[]>([]);
  const [yearMin, setYearMin] = useState<number | undefined>();
  const [attackFamily, setAttackFamily] = useState<string | undefined>();

  const graphFilters = { year_min: yearMin, attack_family: attackFamily };
  const { data: graph, isLoading, isError } = useQuery({
    queryKey: ["invgraph", rootType, rootValue, yearMin, attackFamily],
    queryFn: () => getInvestigationGraph(rootType, rootValue, graphFilters),
    enabled: Boolean(rootValue),
  });

  // The node the analyst is inspecting, and the trail it pins for the victim list.
  const selectedNode = graph?.nodes.find((n) => n.id === selectedId) ?? null;
  const selTrail = selectedNode ? trailFor(selectedNode.type, selectedNode.label) : {};
  const { data: victims, isFetching: victimsLoading } = useQuery({
    queryKey: ["invvictims", rootType, rootValue, selectedId, yearMin, attackFamily],
    queryFn: () => getInvestigationVictims(rootType, rootValue, selTrail, graphFilters),
    enabled: Boolean(selectedNode),
  });

  // Suggestions for the root typeahead (only actor/country have a server vocabulary;
  // the rest are discovered by clicking through the graph or typed free-hand).
  const suggestions = useMemo(() => {
    if (!filters) return [] as string[];
    if (rootType === "actor") return filters.threat_actors;
    if (rootType === "country") return filters.countries;
    return [];
  }, [filters, rootType]);

  const kg = useMemo(() => {
    const nodes: KGNode[] = (graph?.nodes ?? []).map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      val: Math.max(3, n.size),
      layer: n.layer,
      meta: { ...n.metadata, count: n.size },
    }));
    const links: KGLink[] = (graph?.edges ?? []).map((e) => ({
      source: e.source,
      target: e.target,
      relation: e.relation,
    }));
    return { nodes, links };
  }, [graph]);

  const rootId = graph?.root.id ?? null;

  function pickRoot(type: InvestigationRootType, value: string) {
    if (!value) return;
    if (rootValue) setTrail((t) => [...t, { type: rootType, value: rootValue }]);
    setRootType(type);
    setRootValue(value);
    setSelectedId(null);
    setDraft("");
  }

  function focusNode(node: KGNode) {
    const t = (node.type === "vendor" ? "platform" : node.type) as InvestigationRootType;
    if (ROOTS.some((r) => r.type === t)) pickRoot(t, node.label ?? node.id);
  }

  function jumpTo(index: number) {
    // rewind the breadcrumb to a previous root
    const target = trail[index];
    setTrail((t) => t.slice(0, index));
    setRootType(target.type);
    setRootValue(target.value);
    setSelectedId(null);
  }

  return (
    <div className="animate-fade-in space-y-3.5">
      <Card>
        <CardHead
          title="Investigation Knowledge Graph"
          sub="Root on any entity and follow the trail — country → actors → CVEs → platforms → victims"
          accentDot="pulse"
        />
        <CardBody className="p-0">
          <div className="grid lg:grid-cols-[248px_1fr_312px]">
            {/* ── Left rail: root picker + filters ───────────────────────────── */}
            <div className="space-y-4 border-b border-zinc-800/70 p-3.5 lg:border-b-0 lg:border-r">
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Investigate by
                </p>
                <div className="flex flex-wrap gap-1">
                  {ROOTS.map((r) => (
                    <button
                      key={r.type}
                      onClick={() => { setRootType(r.type); setDraft(""); }}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                        rootType === r.type
                          ? "bg-red-500/15 text-red-200 ring-1 ring-red-500/40"
                          : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) pickRoot(rootType, draft.trim()); }}
                    list="inv-root-options"
                    placeholder={`Search ${entityLabel(rootType).toLowerCase()}…`}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900/70 py-1.5 pl-7 pr-2 text-[12px] text-zinc-100 placeholder:text-zinc-600 focus:border-red-500/50 focus:outline-none"
                  />
                  <datalist id="inv-root-options">
                    {suggestions.slice(0, 200).map((s) => <option key={s} value={s} />)}
                  </datalist>
                </div>
                {suggestions.length === 0 && (
                  <p className="mt-1 text-[10px] leading-tight text-zinc-600">
                    Type a value or click any node in the graph to pivot the investigation.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Filters</p>
                <select
                  value={yearMin ?? ""}
                  onChange={(e) => setYearMin(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900/70 px-2 py-1.5 text-[12px] text-zinc-200 focus:outline-none"
                >
                  <option value="">Any year onward</option>
                  {(filters?.years ?? []).map((y) => <option key={y} value={y}>Since {y}</option>)}
                </select>
                <select
                  value={attackFamily ?? ""}
                  onChange={(e) => setAttackFamily(e.target.value || undefined)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900/70 px-2 py-1.5 text-[12px] text-zinc-200 focus:outline-none"
                >
                  <option value="">All attack types</option>
                  {(filters?.attack_categories ?? []).map((c) => (
                    <option key={c} value={c.split("_")[0]}>{c.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>

              {graph && (
                <div className="rounded-lg border border-zinc-800/70 bg-zinc-900/40 p-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Scope</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-zinc-100">
                    {formatNumber(graph.meta.total_incidents)}
                  </p>
                  <p className="text-[11px] text-zinc-500">incidents on this trail</p>
                </div>
              )}
            </div>

            {/* ── Center: force-directed knowledge graph ─────────────────────── */}
            <div className="border-b border-zinc-800/70 p-2 lg:border-b-0 lg:border-r">
              {/* breadcrumb */}
              <div className="flex flex-wrap items-center gap-1 px-1.5 pb-2 text-[11px]">
                {trail.map((t, i) => (
                  <span key={`${t.type}:${t.value}:${i}`} className="flex items-center gap-1">
                    <button onClick={() => jumpTo(i)} className="text-zinc-500 hover:text-zinc-200">
                      {t.value}
                    </button>
                    <ChevronRight className="h-3 w-3 text-zinc-700" />
                  </span>
                ))}
                <span
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium"
                  style={{ color: entityColor(rootType), background: `${entityColor(rootType)}1a` }}
                >
                  {entityLabel(rootType)}: {rootValue}
                </span>
              </div>

              {isLoading ? (
                <GraphSkeleton header={false} filters={false} />
              ) : isError || !graph ? (
                <div className="grid h-[520px] place-items-center text-sm text-zinc-600">
                  No incidents match this root. Try another value.
                </div>
              ) : (
                <KnowledgeGraph
                  nodes={kg.nodes}
                  links={kg.links}
                  height={520}
                  layout="auto"
                  highlightId={selectedId ?? rootId}
                  onSelect={setSelectedId}
                />
              )}
            </div>

            {/* ── Right drawer: node detail + victim drill-down ──────────────── */}
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
                        {selectedNode.label}
                      </h3>
                    </div>
                    <button onClick={() => setSelectedId(null)} className="text-zinc-600 hover:text-zinc-300">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => focusNode(selectedNode)}
                    className="ops-chip ops-chip-brand mt-3 inline-flex items-center gap-1"
                  >
                    <Crosshair className="h-3.5 w-3.5" /> Focus investigation here
                  </button>

                  <div className="mt-3.5">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                      Victims on this trail{" "}
                      <span className="font-mono text-zinc-300">
                        {victims ? `(${formatNumber(victims.count)})` : ""}
                      </span>
                    </p>
                    {victimsLoading ? (
                      <p className="text-[12px] text-zinc-600">Loading…</p>
                    ) : victims && victims.institutions.length > 0 ? (
                      <ul className="max-h-[360px] space-y-1 overflow-y-auto pr-1">
                        {victims.institutions.map((v) => (
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
                                {typeof v.records_affected_max === "number" && v.records_affected_max > 0 && (
                                  <span>· ≤{formatNumber(v.records_affected_max)} records</span>
                                )}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[12px] text-zinc-600">No victims on this exact trail.</p>
                    )}
                  </div>
                </div>
              ) : (
                <RootSummary graph={graph} />
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function RootSummary({ graph }: { graph: InvestigationGraphResponse | undefined }) {
  if (!graph) {
    return (
      <div className="grid h-full place-items-center text-center">
        <p className="text-[12px] text-zinc-500">Pick a starting point to build the graph.</p>
      </div>
    );
  }
  const groups = (graph.victim_groups ?? []).slice(0, 8);
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
        {entityLabel(graph.root.type)}: <span className="text-zinc-300">{graph.root.value}</span>
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-zinc-400">
        Click any node to inspect it and reveal the victims reached along that trail, or
        “Focus” to re-root the investigation there.
      </p>
      {groups.length > 0 && (
        <div className="mt-3.5">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
            Affected via
          </p>
          <div className="space-y-1">
            {groups.map((g: any) => (
              <div key={g.key} className="flex items-center justify-between rounded-md bg-zinc-900/40 px-2 py-1 text-[12px]">
                <span className="text-zinc-300">{g.label}</span>
                <span className="font-mono text-zinc-400">{formatNumber(g.count)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
