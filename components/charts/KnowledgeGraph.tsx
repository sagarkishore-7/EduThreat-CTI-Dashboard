"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { forceCollide, forceRadial } from "d3-force";

// react-force-graph-2d touches window/canvas, so it must load client-only. We
// lazy-load it into state in an effect (instead of next/dynamic) because
// next/dynamic does NOT forward refs to the wrapped component — that silently
// left fgRef.current null, so the custom force layout never applied.

export type KGEntityType =
  | "actor"
  | "family"
  | "country"
  | "campaign"
  | "vendor"
  | "cve"
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
  /** Typed attack-chain relation for the traced campaign graph. */
  relation?: string;
}

// Shared entity palette + glyph, reused across investigations / campaigns / intel graph.
// Each type carries a DISTINCT hue AND a glyph, so nodes (and the legend dots, which
// read the same map) are differentiated by both. The hues are spread around the wheel
// so adjacent types never read as the same colour — the previous vendor amber (#ffb648)
// and CVE orange (#ff8c42) were near-identical, and country/institution were both green.
export const ENTITY_STYLE: Record<string, { color: string; label: string; glyph: string }> = {
  actor: { color: "#ff4757", label: "Threat actor", glyph: "💀" }, // red
  family: { color: "#818cf8", label: "Ransomware family", glyph: "🔒" }, // indigo
  country: { color: "#22d3ee", label: "Country", glyph: "🌐" }, // cyan
  campaign: { color: "#f472b6", label: "Campaign", glyph: "🎯" }, // pink
  vendor: { color: "#c2703d", label: "Vendor", glyph: "🏢" }, // bronze
  cve: { color: "#fbbf24", label: "CVE", glyph: "🐞" }, // gold
  platform: { color: "#4dbcff", label: "Platform", glyph: "🖥️" }, // blue
  technique: { color: "#a855f7", label: "MITRE technique", glyph: "⚙️" }, // violet
  incident: { color: "#8189a0", label: "Incident", glyph: "⚡" }, // slate
  institution: { color: "#34d399", label: "Institution", glyph: "🎓" }, // emerald
};
// Legacy node type from pre-traced graph data — render as a CVE so old payloads
// (and any cached responses) don't fall through to the default slate dot.
ENTITY_STYLE.cve_or_product = ENTITY_STYLE.cve;

// Subtle per-relation edge tint for the traced attack chain (falls back to the
// source node's colour for untyped links / the other graphs).
const RELATION_COLOR: Record<string, string> = {
  attributed_to: "#f472b6", // actor → campaign (pink)
  used_cve: "#fbbf24", // actor → CVE (gold)
  exploits: "#ff6b6b", // CVE → platform (red — the exploitation step)
  makes: "#c2703d", // vendor → platform (bronze)
  affected: "#34d399", // platform/vendor → institution (emerald)
  targeted: "#4dbcff", // centre → platform (blue)
  supply_chain: "#c2703d", // centre → vendor (bronze)
};

const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

function entityColor(type: string, explicit?: string): string {
  return explicit || ENTITY_STYLE[type]?.color || "#8189a0";
}

function entityGlyph(type: string): string {
  return ENTITY_STYLE[type]?.glyph ?? "•";
}

// Drawn node radius — shared by the renderer, the pointer hit-area and the
// collision force so the layout spacing matches what's painted.
function nodeRadius(node: { val?: number }): number {
  return 2.5 + Math.sqrt(node.val ?? 4) * 1.25;
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
  /**
   * Dense hub-and-spoke graphs (campaign detail) where the surrounding card
   * already lists the entities: label nothing by default, reveal on hover only.
   */
  minimalLabels?: boolean;
  /**
   * Layout strategy. "auto" (default) picks star vs. network from the topology.
   * "traced" lays the campaign attack chain out as concentric rings by BFS depth
   * from `centerId` (actor → CVE → platform/vendor → institution reads outward).
   */
  layout?: "auto" | "traced";
  /** Centre node for the traced layout (the actor or campaign hub). */
  centerId?: string | null;
}

export function KnowledgeGraph({
  nodes,
  links,
  height = 520,
  onSelect,
  highlightId = null,
  className,
  showLegend = true,
  minimalLabels = false,
  layout = "auto",
  centerId = null,
}: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  // ForceGraph2D is lazy-loaded, so a plain ref can still be null when the
  // force-config effect first runs (and it wouldn't re-run when the instance
  // later mounts). A callback ref bumps this counter the moment the instance is
  // available, so the effect re-runs and our custom forces actually apply.
  const [fgReady, setFgReady] = useState(0);
  const setFgRef = useCallback((inst: any) => {
    fgRef.current = inst;
    if (inst) setFgReady((v) => v + 1);
  }, []);
  const [width, setWidth] = useState(0);
  const [hoverId, setHoverId] = useState<string | null>(null);
  // Client-only lazy load of react-force-graph-2d (preserves ref forwarding).
  const [ForceGraph2D, setForceGraph2D] = useState<any>(null);
  useEffect(() => {
    let mounted = true;
    import("react-force-graph-2d").then((m) => {
      if (mounted) setForceGraph2D(() => m.default);
    });
    return () => {
      mounted = false;
    };
  }, []);

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
    const nodes = graphData.nodes;
    const n = nodes.length;

    // --- Traced attack chain: a deterministic radial dendrogram ---------------
    // The campaign graph is an attack chain (actor → CVE → platform/vendor →
    // institution), not a star. A physics layout — even forceRadial — only fixes
    // each node's radius, not its angle, so siblings scatter and edges cross. We
    // instead place every node DETERMINISTICALLY: radius = BFS hop-distance from
    // the centre, angle = the node's slice of its parent's angular wedge (sized by
    // the leaf count beneath it). Positions are pinned (fx/fy), so the trace reads
    // cleanly outward with no overlap and is stable across renders.
    if (layout === "traced") {
      const adj = new Map<string, string[]>();
      const degree = new Map<string, number>();
      for (const l of graphData.links as any[]) {
        const s = typeof l.source === "object" ? l.source.id : l.source;
        const t = typeof l.target === "object" ? l.target.id : l.target;
        (adj.get(s) ?? adj.set(s, []).get(s)!).push(t);
        (adj.get(t) ?? adj.set(t, []).get(t)!).push(s);
        degree.set(s, (degree.get(s) ?? 0) + 1);
        degree.set(t, (degree.get(t) ?? 0) + 1);
      }
      // Centre: the supplied id when present, else the highest-degree node.
      let rootId = centerId && nodes.some((nd: any) => nd.id === centerId) ? centerId : null;
      if (!rootId) {
        let best = -1;
        Array.from(degree.entries()).forEach(([id, d]) => {
          if (d > best) {
            best = d;
            rootId = id;
          }
        });
      }
      rootId = rootId ?? nodes[0]?.id ?? null;

      // BFS from the centre: depth + a single tree parent per node (first reached).
      const depth = new Map<string, number>();
      const parent = new Map<string, string>();
      if (rootId) {
        depth.set(rootId, 0);
        const queue: string[] = [rootId];
        while (queue.length) {
          const cur = queue.shift() as string;
          const d = depth.get(cur)!;
          for (const nb of (adj.get(cur) ?? []).slice().sort()) {
            if (!depth.has(nb)) {
              depth.set(nb, d + 1);
              parent.set(nb, cur);
              queue.push(nb);
            }
          }
        }
      }
      const maxDepth = Math.max(1, ...Array.from(depth.values()));
      const depthOf = (id: string) => (depth.has(id) ? depth.get(id)! : maxDepth + 1);

      // Tree children (stable order) + leaf counts beneath each node.
      const children = new Map<string, string[]>();
      Array.from(parent.entries()).forEach(([id, p]) => {
        (children.get(p) ?? children.set(p, []).get(p)!).push(id);
      });
      children.forEach((arr) => arr.sort());
      const leaves = new Map<string, number>();
      const countLeaves = (id: string): number => {
        const ch = children.get(id) ?? [];
        if (!ch.length) {
          leaves.set(id, 1);
          return 1;
        }
        let s = 0;
        for (const c of ch) s += countLeaves(c);
        leaves.set(id, s);
        return s;
      };
      const totalLeaves = rootId ? countLeaves(rootId) : 1;

      // Angle = midpoint of the node's wedge; each child gets a slice proportional
      // to its leaf count, so dense subtrees fan out and sparse ones stay tight.
      const angle = new Map<string, number>();
      const assign = (id: string, a0: number, a1: number) => {
        angle.set(id, (a0 + a1) / 2);
        const ch = children.get(id) ?? [];
        if (!ch.length) return;
        const total = leaves.get(id) || 1;
        let cur = a0;
        for (const c of ch) {
          const span = (a1 - a0) * ((leaves.get(c) || 1) / total);
          assign(c, cur, cur + span);
          cur += span;
        }
      };
      if (rootId) assign(rootId, -Math.PI / 2, (3 * Math.PI) / 2);

      // Ring spacing: even rings, with the outermost wide enough that equally
      // spaced leaves (2π / totalLeaves apart) clear each other.
      const rLeaf = nodeRadius({ val: 4 });
      const minGap = 2 * rLeaf + 40;
      const ringStep = 2 * rLeaf + 110;
      const fitRadius = (totalLeaves * minGap) / (2 * Math.PI * Math.max(1, maxDepth));
      const baseRadius = Math.max(ringStep, fitRadius);

      // Unreached nodes (no path from the centre) ring just outside, evenly spaced.
      const unreached = nodes.filter((nd: any) => !angle.has(nd.id));
      unreached.forEach((nd: any, i: number) => {
        angle.set(nd.id, -Math.PI / 2 + (i / Math.max(1, unreached.length)) * 2 * Math.PI);
      });

      // Pin every node at its (radius, angle); physics off so it stays put.
      nodes.forEach((nd: any) => {
        const r = depthOf(nd.id) * baseRadius;
        const a = angle.get(nd.id) ?? 0;
        nd.fx = nd.id === rootId ? 0 : r * Math.cos(a);
        nd.fy = nd.id === rootId ? 0 : r * Math.sin(a);
      });
      fg.d3Force?.("charge")?.strength?.(0);
      fg.d3Force?.("link")?.strength?.(0);
      fg.d3Force?.("radial", null);
      fg.d3Force?.("collide", null);
      fg.d3ReheatSimulation?.();
      return;
    }

    // Detect a hub-and-spoke "star" (the campaign-detail graph: one campaign node
    // with every member linked to it). Tuning charge/link numbers alone leaves the
    // leaves as an UNEVEN physics scatter at varying radii that reads as clutter and
    // can overflow the viewport. For a star we instead constrain the leaves to ONE
    // ring with forceRadial, so they distribute evenly on a clean circle whose radius
    // scales with the leaf count (enough circumference for every node) — deterministic
    // and overlap-free. Non-star (multi-hub) graphs keep the network force tuning.
    const degree = new Map<string, number>();
    for (const l of graphData.links as any[]) {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      degree.set(s, (degree.get(s) ?? 0) + 1);
      degree.set(t, (degree.get(t) ?? 0) + 1);
    }
    let hubId: string | null = null;
    let hubDeg = 0;
    Array.from(degree.entries()).forEach(([id, d]) => {
      if (d > hubDeg) {
        hubDeg = d;
        hubId = id;
      }
    });
    const leaves = nodes.filter((nd: any) => (degree.get(nd.id) ?? 0) <= 1).length;
    const isStar = n >= 6 && hubDeg >= Math.max(4, (n - 1) * 0.6) && leaves >= n * 0.6;

    const charge = fg.d3Force?.("charge");
    const link = fg.d3Force?.("link");

    // Pin the hub to the simulation origin for a star (so forceRadial — which
    // centres on (0,0) — forms a true ring around it); release any pin otherwise.
    nodes.forEach((nd: any) => {
      if (isStar && nd.id === hubId) {
        nd.fx = 0;
        nd.fy = 0;
      } else {
        nd.fx = undefined;
        nd.fy = undefined;
      }
    });

    if (isStar) {
      // Distribute the leaves over one or more CONCENTRIC rings so no single ring
      // is so crowded its node discs/glyphs touch. zoomToFit normalises absolute
      // size, so what matters is nodes-per-ring (angular spacing), not radius:
      // cap each ring at ~PER_RING and add rings as the leaf count grows. Each
      // leaf gets a stable per-node target radius via forceRadial.
      const rLeaf = nodeRadius({ val: 4 });
      const PER_RING = 16;
      const ringCount = Math.max(1, Math.ceil(leaves / PER_RING));
      const perRing = Math.ceil(leaves / ringCount);
      const baseRing = Math.max(150, Math.ceil((perRing * (2 * rLeaf + 40)) / (2 * Math.PI)));
      const ringGap = 2 * rLeaf + 64;
      // Assign each leaf (stably, by id order) to a ring index.
      const leafIds = nodes
        .filter((nd: any) => nd.id !== hubId && (degree.get(nd.id) ?? 0) <= 1)
        .map((nd: any) => nd.id)
        .sort();
      const ringOf = new Map<string, number>();
      leafIds.forEach((id, i) => ringOf.set(id, i % ringCount));
      const targetRadius = (node: any) =>
        node.id === hubId ? 0 : baseRing + (ringOf.get(node.id) ?? 0) * ringGap;

      if (charge) {
        charge.strength(Math.max(-900, -140 - n * 6));
        charge.distanceMax?.(900);
      }
      // Weak link force so the radial constraint owns the radius (otherwise the two
      // forces fight and re-introduce the uneven scatter).
      if (link) link.distance(baseRing).strength(0.04);
      fg.d3Force?.(
        "radial",
        forceRadial(targetRadius, 0, 0).strength((node: any) => (node.id === hubId ? 0 : 0.92)),
      );
      fg.d3Force?.("collide", forceCollide((node: any) => nodeRadius(node) + 16).strength(1).iterations(3));
    } else {
      // Multi-hub network: repulsion scaled by node count + collision keeps it clear.
      if (charge) {
        charge.strength(Math.max(-1200, -180 - n * 7));
        charge.distanceMax?.(900);
      }
      if (link) link.distance(70 + Math.min(170, n * 4)).strength(0.45);
      fg.d3Force?.("radial", null); // clear any star radial from a previous dataset
      fg.d3Force?.("collide", forceCollide((node: any) => nodeRadius(node) + 16).strength(1));
    }
    fg.d3ReheatSimulation?.();
  }, [graphData, width, fgReady, layout, centerId]);

  const drawNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const r = 2.5 + Math.sqrt(node.val ?? 4) * 1.25;
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

      // Node = dark disc + colour-coded ring + a type glyph (💀 actor, 🎯
      // campaign, 🎓 institution, …). Encoding type by BOTH colour and icon makes
      // the graph readable even where palette hues are close.
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = "#0d111b";
      ctx.fill();
      ctx.lineWidth = Math.max(0.8, r * 0.3);
      ctx.strokeStyle = color;
      ctx.stroke();
      // Glyph sized to the node; scales with the node on zoom like the rest of
      // the graph. Falls back to a coloured dot if the glyph can't render.
      const glyph = entityGlyph(node.type);
      const glyphSize = r * 1.15;
      ctx.font = `${glyphSize}px ${EMOJI_FONT}`;
      ctx.textAlign = "center";
      // Emoji don't sit on the text baseline predictably, so a fixed nudge never
      // truly centres them. Measure the glyph's actual ink box and offset by its
      // midpoint so it's optically centred in the ring regardless of font/emoji.
      ctx.textBaseline = "alphabetic";
      const m = ctx.measureText(glyph);
      const ascent = m.actualBoundingBoxAscent ?? glyphSize * 0.7;
      const descent = m.actualBoundingBoxDescent ?? glyphSize * 0.2;
      ctx.fillText(glyph, node.x, node.y + (ascent - descent) / 2);

      // Label density: keep the on-screen set sparse so labels never overlap.
      // The campaign/intel graphs are hub-and-spoke with MANY leaf nodes
      // (institutions / incidents); labelling them all is the "wall of text" that
      // makes the graph look cluttered. So by default we only label the hub +
      // anchor entities (campaign, vendor, actor, CVE, platform, family, …) and
      // reveal the numerous leaf labels (institution / incident) only on hover or
      // when zoomed in close. While hovering, label the focused node + neighbours.
      const weight = node.val ?? 4;
      // Leaf entities (institutions/incidents) are numerous; mid entities
      // (vendor/CVE/platform/family) cluster around a campaign hub. Labelling all
      // of them is the "wall of text". By default label only the prominent hub
      // entities (campaign + big actor/country hubs); reveal everything else on
      // hover or when zoomed in. The campaign detail card already lists the
      // vendors/CVEs/actors as chips, so the graph doesn't need their labels.
      const isHub = node.type === "campaign" || node.type === "actor" || node.type === "country";
      const showLabel =
        active != null
          ? lit
          : minimalLabels
            ? globalScale > 2.4 // dense campaign graph: hover/zoom only
            : isHub
              ? weight >= 10 || globalScale > 1.0
              : globalScale > 2.4;
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
        const PX = 11; // constant on-screen label size at every zoom
        const fontDev = PX * ratio;
        const text = label.length > 30 ? label.slice(0, 28) + "…" : label;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // NOTE: Canvas 2D does NOT resolve CSS custom properties — a font string
        // containing `var(--font-geist-mono)` is invalid, silently ignored, and
        // leaves ctx.font at the default "10px sans-serif". That single bug made
        // every label render ~10px regardless of the size we computed. Use a
        // concrete monospace stack so the size actually takes effect.
        ctx.font = `${fontDev}px ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`;
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
    [active, isLit, minimalLabels],
  );

  return (
    <div ref={containerRef} className={className} style={{ position: "relative", height }}>
      {showLegend && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-zinc-800/70 bg-[#080b12]/85 px-2.5 py-1.5 backdrop-blur-sm">
          {Array.from(new Set(nodes.map((n) => n.type))).slice(0, 8).map((t) => (
            <span key={t} className="flex items-center gap-1 text-[10px] text-zinc-400">
              <span className="text-[11px] leading-none">{entityGlyph(t)}</span>
              <span className="h-2 w-2 rounded-full" style={{ background: entityColor(t) }} />
              {ENTITY_STYLE[t]?.label ?? t}
            </span>
          ))}
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2 right-3 z-10 font-mono text-[10px] text-zinc-600">
        {nodes.length} nodes · {links.length} edges
      </div>
      {width > 0 && !ForceGraph2D && (
        <div className="grid h-full w-full place-items-center text-sm text-zinc-600">Loading graph…</div>
      )}
      {width > 0 && ForceGraph2D && (
        <ForceGraph2D
          ref={setFgRef as any}
          width={width}
          height={height}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={4}
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={drawNode}
          nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
            const r = 2.5 + Math.sqrt(node.val ?? 4) * 1.25;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 2, 0, 2 * Math.PI);
            ctx.fill();
          }}
          linkColor={(l: any) => {
            if (!linkLit(l)) return "rgba(120,130,150,0.06)";
            // Traced chain: tint each edge by its relation (exploits = red, affected
            // = green, …) so the attack path reads at a glance; otherwise fall back
            // to the source node's entity colour (intel-graph / star graphs).
            const relColor = l.relation ? RELATION_COLOR[l.relation] : undefined;
            const base = relColor ?? entityColor(typeof l.source === "object" ? l.source.type : "incident");
            return base + "77";
          }}
          linkWidth={(l: any) => {
            if (!linkLit(l)) return 0.4;
            // Emphasise the exploitation step in the traced chain.
            return l.relation === "exploits" ? 1.6 : 1;
          }}
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
