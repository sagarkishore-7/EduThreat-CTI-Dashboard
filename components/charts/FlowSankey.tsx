"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { sankey as d3Sankey, sankeyLinkHorizontal, type SankeyGraph } from "d3-sankey";
import { entityColor, entityIcon } from "@/lib/entity-style";

// A weighted, left-to-right Sankey for the investigations + intel-graph relationship flows
// (country → actor → {campaign,family} → CVE). Ribbon width encodes incident volume — the
// thing a force-graph can't show. Bespoke SVG (gradient ribbons + DOM-overlaid node cards
// with lucide icons + counts), hover-to-highlight-path, click → onSelect. d3-sankey only
// computes geometry.

export interface SankeyNodeInput {
  id: string;
  label: string;
  type: string;
  layer: number;
}
export interface SankeyLinkInput {
  source: string;
  target: string;
  value: number;
  relation?: string;
}

interface FlowSankeyProps {
  nodes: SankeyNodeInput[];
  links: SankeyLinkInput[];
  height?: number;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

type SNode = SankeyNodeInput & {
  index?: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  value?: number;
};
type SLink = {
  source: SNode;
  target: SNode;
  value: number;
  relation?: string;
  width?: number;
  y0?: number;
  y1?: number;
};

export function FlowSankey({ nodes, links, height = 540, selectedId = null, onSelect }: FlowSankeyProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hoverId, setHoverId] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w) setWidth(Math.floor(w));
    });
    ro.observe(el);
    setWidth(Math.floor(el.clientWidth));
    return () => ro.disconnect();
  }, []);

  // Drop links whose endpoints aren't present, and self/cyclic (d3-sankey needs a DAG).
  const graph = useMemo(() => {
    if (!width) return null;
    const idSet = new Set(nodes.map((n) => n.id));
    const cleanLinks = links.filter((l) => idSet.has(l.source) && idSet.has(l.target) && l.source !== l.target && l.value > 0);
    // keep only nodes that participate in at least one link (avoid floating boxes)
    const used = new Set<string>();
    for (const l of cleanLinks) {
      used.add(l.source);
      used.add(l.target);
    }
    const usedNodes = nodes.filter((n) => used.has(n.id));
    if (!usedNodes.length || !cleanLinks.length) return null;

    // Pin each node to its assigned column by compacting the present `layer` values to a
    // contiguous 0..C range and aligning on that. d3-sankey's default (sankeyJustify)
    // ignores our layer and right-justifies leaf nodes — which pushed actors with no
    // ransomware family into the family column. This keeps every entity type in its stage.
    const presentLayers = Array.from(new Set(usedNodes.map((n) => n.layer))).sort((a, b) => a - b);
    const colOfLayer = new Map(presentLayers.map((lv, i) => [lv, i]));

    const sankeyGen = d3Sankey<SNode, SLink>()
      .nodeId((d) => d.id)
      .nodeAlign((n) => colOfLayer.get((n as SNode).layer) ?? 0)
      .nodeWidth(13)
      .nodePadding(14)
      .extent([
        [2, 8],
        [width - 2, height - 8],
      ]);
    try {
      // With nodeId set, links reference nodes by their id STRING (not index).
      return sankeyGen({
        nodes: usedNodes.map((n) => ({ ...n })),
        links: cleanLinks.map((l) => ({
          source: l.source,
          target: l.target,
          value: l.value,
          relation: l.relation,
        })),
      } as unknown as SankeyGraph<SNode, SLink>);
    } catch {
      return null;
    }
  }, [nodes, links, width, height]);

  const active = hoverId ?? selectedId;
  const litNodes = useMemo(() => {
    if (!graph || !active) return null;
    const lit = new Set<string>([active]);
    // walk both directions from the active node
    const fwd = (id: string) => {
      for (const l of graph.links as unknown as SLink[]) {
        if (l.source.id === id && !lit.has(l.target.id)) {
          lit.add(l.target.id);
          fwd(l.target.id);
        }
      }
    };
    const back = (id: string) => {
      for (const l of graph.links as unknown as SLink[]) {
        if (l.target.id === id && !lit.has(l.source.id)) {
          lit.add(l.source.id);
          back(l.source.id);
        }
      }
    };
    fwd(active);
    back(active);
    return lit;
  }, [graph, active]);

  const linkLit = useCallback(
    (l: SLink) => !litNodes || (litNodes.has(l.source.id) && litNodes.has(l.target.id)),
    [litNodes],
  );
  const nodeLit = useCallback((id: string) => !litNodes || litNodes.has(id), [litNodes]);

  const pathGen = sankeyLinkHorizontal<SNode, SLink>();

  return (
    <div className="w-full">
      <LegendStrip nodes={nodes} />
      <div ref={ref} className="w-full overflow-x-auto" style={{ minHeight: height }}>
      {!graph ? (
        <div className="grid place-items-center text-sm text-zinc-600" style={{ height }}>
          No relationships match the current filters.
        </div>
      ) : (
        <svg width={width} height={height} className="block">
          <defs>
            {(graph.links as unknown as SLink[]).map((l, i) => (
              <linearGradient
                key={`g${i}`}
                id={`sankey-grad-${i}`}
                gradientUnits="userSpaceOnUse"
                x1={l.source.x1}
                x2={l.target.x0}
              >
                <stop offset="0%" stopColor={entityColor(l.source.type)} />
                <stop offset="100%" stopColor={entityColor(l.target.type)} />
              </linearGradient>
            ))}
          </defs>

          {/* ribbons */}
          <g>
            {(graph.links as unknown as SLink[]).map((l, i) => {
              const lit = linkLit(l);
              return (
                <motion.path
                  key={`l${i}`}
                  d={pathGen(l) ?? undefined}
                  fill="none"
                  stroke={`url(#sankey-grad-${i})`}
                  strokeWidth={Math.max(1, l.width ?? 1)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: lit ? 0.55 : active ? 0.07 : 0.28 }}
                  transition={{ duration: 0.5 }}
                  style={{ mixBlendMode: "screen" }}
                />
              );
            })}
          </g>

          {/* node bars */}
          <g>
            {(graph.nodes as unknown as SNode[]).map((n) => {
              const lit = nodeLit(n.id);
              const color = entityColor(n.type);
              const h = (n.y1 ?? 0) - (n.y0 ?? 0);
              return (
                <rect
                  key={n.id}
                  x={n.x0}
                  y={n.y0}
                  width={(n.x1 ?? 0) - (n.x0 ?? 0)}
                  height={Math.max(2, h)}
                  rx={2.5}
                  fill={color}
                  opacity={lit ? 1 : 0.3}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverId(n.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={() => onSelect?.(selectedId === n.id ? null : n.id)}
                />
              );
            })}
          </g>

          {/* node labels (DOM-quality text via SVG, with icon hint) */}
          <g>
            {(graph.nodes as unknown as SNode[]).map((n) => {
              const lit = nodeLit(n.id);
              const leftHalf = (n.x0 ?? 0) < width / 2;
              const cx = leftHalf ? (n.x1 ?? 0) + 6 : (n.x0 ?? 0) - 6;
              const cy = ((n.y0 ?? 0) + (n.y1 ?? 0)) / 2;
              const count = Math.round(n.value ?? 0);
              const label = n.label.length > 22 ? n.label.slice(0, 21) + "…" : n.label;
              return (
                <text
                  key={`t${n.id}`}
                  x={cx}
                  y={cy}
                  dy="0.32em"
                  textAnchor={leftHalf ? "start" : "end"}
                  fontSize={11}
                  className="pointer-events-none select-none"
                  fill={lit ? "#e7e9ee" : "#5b6170"}
                  style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
                >
                  {label}
                  <tspan fill={entityColor(n.type)} fontSize={9.5} dx={5}>
                    {count}
                  </tspan>
                </text>
              );
            })}
          </g>
        </svg>
      )}
      </div>
    </div>
  );
}

function LegendStrip({ nodes }: { nodes: SankeyNodeInput[] }) {
  // Ordered by column so the legend reads in the same left-to-right order as the flow.
  const types = useMemo(() => {
    const firstLayer = new Map<string, number>();
    for (const n of nodes) if (!firstLayer.has(n.type)) firstLayer.set(n.type, n.layer);
    return Array.from(firstLayer.keys()).sort((a, b) => (firstLayer.get(a)! - firstLayer.get(b)!));
  }, [nodes]);
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      {types.map((t) => {
        const Icon = entityIcon(t);
        return (
          <span key={t} className="flex items-center gap-1 text-[10px] capitalize text-zinc-400">
            <Icon size={11} style={{ color: entityColor(t) }} />
            {t}
          </span>
        );
      })}
    </div>
  );
}
