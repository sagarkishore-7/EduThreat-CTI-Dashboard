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
import { formatNumber, getCountryFlag } from "@/lib/utils";
import { entityColor, entityIcon, entityLabel } from "@/lib/entity-style";
import type { KGNode, KGLink } from "@/components/charts/KnowledgeGraph";
import { Sliders, X, ChevronLeft, Loader2, Waypoints } from "lucide-react";

const KnowledgeGraph = dynamic(
  () => import("@/components/charts/KnowledgeGraph").then((m) => m.KnowledgeGraph),
  { ssr: false },
);

// Country labels stay on permanently — module-level so the array reference is stable.
const ALWAYS_LABEL = ["country"];

// The four node tiers, largest to smallest, for the legend.
const TIERS: { type: string; hint: string }[] = [
  { type: "country", hint: "largest" },
  { type: "actor", hint: "" },
  { type: "cve", hint: "" },
  { type: "platform", hint: "smallest" },
];

export default function IntelGraphPage() {
  const [minActor, setMinActor] = useState(1);
  const [minPlatform, setMinPlatform] = useState(1);
  const [includeCves, setIncludeCves] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isolate, setIsolate] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);

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
      val: n.size,
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
    // Full-viewport canvas: fill the height under the header so the graph dominates.
    <div className="animate-fade-in relative h-[calc(100vh-6.25rem)] min-h-[540px] w-full overflow-hidden rounded-xl border border-zinc-800/70 bg-[#080b12]">
      {/* ── The graph, full-bleed ─────────────────────────────────────────── */}
      <div className="absolute inset-0">
        {isLoading ? (
          <div className="grid h-full w-full place-items-center text-sm text-zinc-500">
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Building the threat graph…
            </span>
          </div>
        ) : isError || !graph ? (
          <div className="grid h-full w-full place-items-center text-sm text-zinc-600">
            Could not load the intelligence graph.
          </div>
        ) : (
          <KnowledgeGraph
            nodes={kg.nodes}
            links={kg.links}
            fillParent
            layout="auto"
            minimalLabels
            showLegend={false}
            alwaysLabelTypes={ALWAYS_LABEL}
            highlightMode="trail"
            isolateActive={isolate}
            highlightId={selectedId}
            onSelect={setSelectedId}
          />
        )}
      </div>

      {/* ── Title chip (top-left, above controls) ─────────────────────────── */}
      <div className="pointer-events-none absolute left-3 top-3 z-30 flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-lg border border-zinc-800/70 bg-[#080b12]/85 px-2.5 py-1.5 text-[12px] font-semibold text-zinc-200 backdrop-blur-sm">
          <Waypoints className="h-3.5 w-3.5 text-red-400" /> Threat Intelligence Graph
        </span>
        {graph && (
          <span className="hidden rounded-lg border border-zinc-800/70 bg-[#080b12]/85 px-2 py-1.5 font-mono text-[10px] text-zinc-500 backdrop-blur-sm sm:inline">
            {formatNumber(graph.meta.node_count)} nodes · {formatNumber(graph.meta.edge_count)} links
          </span>
        )}
      </div>

      {/* ── Controls drawer (top-left) — collapsible so the graph gets space ─ */}
      {controlsOpen ? (
        <div className="absolute left-3 top-14 z-30 w-[236px] rounded-xl border border-zinc-800/70 bg-[#0a0d15]/92 p-3 shadow-xl backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Controls</span>
            <button
              onClick={() => setControlsOpen(false)}
              className="rounded p-0.5 text-zinc-500 hover:text-zinc-200"
              title="Hide controls"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Legend */}
          <div className="space-y-1.5">
            {TIERS.map((t, i) => (
              <div key={t.type} className="flex items-center gap-2">
                <span
                  className="inline-block shrink-0 rounded-full"
                  style={{ width: 18 - i * 3, height: 18 - i * 3, background: entityColor(t.type) }}
                />
                <span className="text-[12px] text-zinc-300">{entityLabel(t.type)}</span>
                {t.hint && <span className="text-[10px] text-zinc-600">{t.hint}</span>}
                {tc[t.type] ? <span className="ml-auto font-mono text-[10px] text-zinc-600">{tc[t.type]}</span> : null}
              </div>
            ))}
          </div>

          <p className="mt-2 rounded-md bg-zinc-900/50 px-2 py-1.5 text-[10px] leading-tight text-zinc-500">
            Click any node to trace its <span className="text-zinc-300">full trail</span>. Toggle
            <span className="text-zinc-300"> Isolate</span> to follow it alone.
          </p>

          {/* Density */}
          <div className="mt-3 space-y-2.5 border-t border-zinc-800/60 pt-2.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Density</span>
            <Slider label="Min. actor incidents" value={minActor} onChange={setMinActor} />
            <Slider label="Min. platform incidents" value={minPlatform} onChange={setMinPlatform} />
            <label className="flex items-center gap-2 text-[12px] text-zinc-300">
              <input type="checkbox" checked={includeCves} onChange={(e) => setIncludeCves(e.target.checked)} className="accent-red-500" />
              Show CVEs
            </label>
            <label className="flex items-center gap-2 text-[12px] text-zinc-300">
              <input type="checkbox" checked={isolate} onChange={(e) => setIsolate(e.target.checked)} className="accent-red-500" />
              Isolate selected trail
            </label>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setControlsOpen(true)}
          className="absolute left-3 top-14 z-30 flex items-center gap-1.5 rounded-lg border border-zinc-800/70 bg-[#0a0d15]/92 px-2.5 py-1.5 text-[11px] text-zinc-300 shadow-lg backdrop-blur-md hover:text-white"
          title="Show controls"
        >
          <Sliders className="h-3.5 w-3.5" /> Controls
        </button>
      )}

      {/* ── Detail drawer (right) — slides in on select ───────────────────── */}
      <div
        className={`absolute right-0 top-0 z-30 h-full w-[312px] max-w-[86vw] transform border-l border-zinc-800/70 bg-[#0a0d15]/95 shadow-2xl backdrop-blur-md transition-transform duration-200 ${
          selectedNode ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        {selectedNode && (
          <div className="flex h-full flex-col p-3.5">
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
              <button onClick={() => setSelectedId(null)} className="text-zinc-500 hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
              <Stat label="Incidents" value={formatNumber(Number(selectedNode.metadata?.incident_count ?? 0))} />
              {typeof selectedNode.metadata?.country_count === "number" && (
                <Stat label="Countries" value={formatNumber(selectedNode.metadata.country_count as number)} />
              )}
            </div>

            <div className="mt-3.5 flex min-h-0 flex-1 flex-col">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                Incidents{" "}
                <span className="font-mono text-zinc-300">{victims ? `(${formatNumber(victims.count)})` : ""}</span>
              </p>
              {victimsLoading ? (
                <p className="text-[12px] text-zinc-600">Loading…</p>
              ) : victims && victims.institutions.length > 0 ? (
                <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
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
        )}
      </div>
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
