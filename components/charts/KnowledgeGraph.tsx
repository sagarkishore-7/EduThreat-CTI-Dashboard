"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { forceCollide } from "d3-force";

// react-force-graph-2d touches window/canvas — load it client-only.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center text-sm text-zinc-600">
      Loading graph…
    </div>
  ),
});

export type KGEntityType =
  | "actor"
  | "family"
  | "country"
  | "campaign"
  | "vendor"
  | "cve_or_product"
  | "platform"
  | "technique"
  | "incident"
  | "institution"
  | string;

export interface KGNode {
  id: string;
  label?: string;
  type: KGEntityType;
  /** Relative node weight (drives radius). */
  val?: number;
  color?: string;
  meta?: Record<string, unknown>;
  // mutated by the force simulation
  x?: number;
  y?: number;
}

export interface KGLink {
  source: string;
  target: string;
  kind?: string;
}

// Shared entity palette + glyph, reused across investigations / campaigns / intel graph.
export const ENTITY_STYLE: Record<string, { color: string; label: string }> = {
  actor: { color: "#ff4757", label: "Threat actor" },
  family: { color: "#818cf8", label: "Ransomware family" },
  country: { color: "#00d8b4", label: "Country" },
  campaign: { color: "#00d8b4", label: "Campaign" },
  vendor: { color: "#ffb648", label: "Vendor" },
  cve_or_product: { color: "#ff8c42", label: "CVE / product" },
  platform: { color: "#4dbcff", label: "Platform" },
  technique: { color: "#c084fc", label: "MITRE technique" },
  incident: { color: "#8189a0", label: "Incident" },
  institution: { color: "#34d399", label: "Institution" },
};

function entityColor(type: string, explicit?: string): string {
  return explicit || ENTITY_STYLE[type]?.color || "#8189a0";
}

// Drawn node radius — shared by the renderer, the pointer hit-area and the
// collision force so the layout spacing matches what's painted.
function nodeRadius(node: { val?: number }): number {
  return 3 + Math.sqrt(node.val ?? 4) * 1.6;
}

interface KnowledgeGraphProps {
  nodes: KGNode[];
  links: KGLink[];
  height?: number;
  /** Fired with the node id (or null) when a node is clicked. */
  onSelect?: (id: string | null) => void;
  /** Externally-selected node id to emphasise. */
  highlightId?: string | null;
  className?: string;
  /** Show the entity-type legend overlay (default true). */
  showLegend?: boolean;
}

export function KnowledgeGraph({
  nodes,
  links,
  height = 520,
  onSelect,
  highlightId = null,
  className,
  showLegend = true,
}: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [width, setWidth] = useState(0);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Measure the container so the canvas fills it responsively.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w) setWidth(Math.floor(w));
    });
    ro.observe(el);
    setWidth(Math.floor(el.clientWidth));
    return () => ro.disconnect();
  }, []);

  // Stable graphData reference (force-graph mutates node objects with x/y).
  const graphData = useMemo(
    () => ({
      nodes: nodes.map((n) => ({ ...n, val: Math.max(1, n.val ?? 4) })),
      links: links.map((l) => ({ ...l })),
    }),
    [nodes, links],
  );

  // Adjacency for neighbour-highlighting.
  const neighbours = useMemo(() => {
    const m = new Map<string, Set<string>>();
    const ensure = (id: string) => m.get(id) ?? m.set(id, new Set()).get(id)!;
    for (const l of links) {
      const s = typeof l.source === "string" ? l.source : (l.source as any).id;
      const t = typeof l.target === "string" ? l.target : (l.target as any).id;
      ensure(s).add(t);
      ensure(t).add(s);
    }
    return m;
  }, [links]);

  const active = hoverId ?? highlightId;
  const isLit = useCallback(
    (id: string) => {
      if (!active) return true;
      if (id === active) return true;
      return neighbours.get(active)?.has(id) ?? false;
    },
    [active, neighbours],
  );

  const linkLit = useCallback(
    (l: any) => {
      if (!active) return true;
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      return s === active || t === active;
    },
    [active],
  );

  // Zoom-to-fit once the simulation settles.
  const handleEngineStop = useCallback(() => {
    fgRef.current?.zoomToFit?.(420, 60);
  }, []);

  // Spread nodes so dense graphs (campaign detail, intel-graph) don't overlap:
  // stronger repulsion scaled by node count, longer links, and a collision force
  // sized to the drawn node radius + label padding. Reheat so it re-lays out.
  // Runs once the graph has mounted (width > 0 → fgRef set) and whenever the data
  // changes.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || width === 0) return;
    const n = graphData.nodes.length;
    const charge = fg.d3Force?.("charge");
    if (charge) {
      charge.strength(Math.max(-430, -95 - n * 1.6));
      charge.distanceMax?.(640);
    }
    const link = fg.d3Force?.("link");
    if (link) link.distance(38 + Math.min(30, n * 0.32)).strength(0.5);
    fg.d3Force?.("collide", forceCollide((node: any) => nodeRadius(node) + 13).strength(0.9));
    fg.d3ReheatSimulation?.();
  }, [graphData, width]);

  const drawNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const r = 3 + Math.sqrt(node.val ?? 4) * 1.6;
      const lit = isLit(node.id);
      const color = entityColor(node.type, node.color);
      const label: string = node.label ?? node.id;

      ctx.globalAlpha = lit ? 1 : 0.16;

      // glow for the active node
      if (node.id === active) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 2.1, 0, 2 * Math.PI);
        ctx.fillStyle = color + "33";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = "rgba(8,11,18,0.85)";
      ctx.stroke();

      // Labels: hovered/active node + neighbours always; the rest reveal as you
      // zoom in (so a dense graph isn't a wall of text). Density threshold scales
      // with the node's weight so the big hubs label first.
      // Label density: keep the on-screen set sparse so labels never overlap.
      // When hovering, label the focused node + its neighbours (the lit set).
      // Otherwise label only the prominent hubs, revealing more as you zoom in.
      const weight = node.val ?? 4;
      const showLabel =
        active != null
          ? lit
          : weight >= 11 || globalScale > 1.5 || (weight >= 7 && globalScale > 1.0);
      if (showLabel) {
        // Constant on-screen label size that is smooth across zoom and does NOT
        // grow when zooming in. We render in *screen space* (reset the transform
        // to identity, draw in device pixels) so the size is independent of zoom,
        // and we derive the device-pixel ratio from the LIVE transform
        // (`m.a / globalScale`) rather than `window.devicePixelRatio` — the latter
        // doesn't always match force-graph's canvas scaling, which is what made
        // earlier attempts render too small.
        const m = ctx.getTransform();
        const ratio = m.a / (globalScale || 1); // device px per CSS px
        const sx = m.a * node.x + m.e;
        const sy = m.d * node.y + m.f;
        const onScreenR = r * m.a;
        const PX = 15; // constant CSS px on screen at every zoom
        const fontDev = PX * ratio;
        const text = label.length > 30 ? label.slice(0, 28) + "…" : label;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.font = `${fontDev}px var(--font-geist-mono), ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const ty = sy + onScreenR + 5 * ratio;
        // Dark halo behind the label so names stay legible over links/nodes.
        ctx.lineWidth = 3 * ratio;
        ctx.strokeStyle = "rgba(8,11,18,0.92)";
        ctx.lineJoin = "round";
        ctx.strokeText(text, sx, ty);
        ctx.fillStyle = node.id === active ? "#ffffff" : "rgba(236,236,239,0.96)";
        ctx.fillText(text, sx, ty);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
    [active, isLit],
  );

  return (
    <div ref={containerRef} className={className} style={{ position: "relative", height }}>
      {showLegend && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-zinc-800/70 bg-[#080b12]/85 px-2.5 py-1.5 backdrop-blur-sm">
          {Array.from(new Set(nodes.map((n) => n.type))).slice(0, 8).map((t) => (
            <span key={t} className="flex items-center gap-1 text-[10px] text-zinc-400">
              <span className="h-2 w-2 rounded-full" style={{ background: entityColor(t) }} />
              {ENTITY_STYLE[t]?.label ?? t}
            </span>
          ))}
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2 right-3 z-10 font-mono text-[10px] text-zinc-600">
        {nodes.length} nodes · {links.length} edges
      </div>
      {width > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={width}
          height={height}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={4}
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={drawNode}
          nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
            const r = 3 + Math.sqrt(node.val ?? 4) * 1.6;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 2, 0, 2 * Math.PI);
            ctx.fill();
          }}
          linkColor={(l: any) =>
            linkLit(l)
              ? entityColor(
                  typeof l.source === "object" ? l.source.type : "incident",
                ) + "66"
              : "rgba(120,130,150,0.06)"
          }
          linkWidth={(l: any) => (linkLit(l) ? 1 : 0.4)}
          linkDirectionalParticles={(l: any) => (linkLit(l) && active ? 3 : 0)}
          linkDirectionalParticleSpeed={0.006}
          linkDirectionalParticleWidth={1.6}
          onNodeHover={(n: any) => setHoverId(n?.id ?? null)}
          onNodeClick={(n: any) => onSelect?.(n?.id ?? null)}
          onBackgroundClick={() => onSelect?.(null)}
          cooldownTicks={120}
          onEngineStop={handleEngineStop}
          d3VelocityDecay={0.28}
          minZoom={0.4}
          maxZoom={6}
        />
      )}
    </div>
  );
}
