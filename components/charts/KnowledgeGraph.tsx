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
  /** Column index (0 = root) for the left-to-right `layout="flow"` mode. */
  layer?: number;
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
  /** Typed attack-chain relation for the flow layout. */
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

// Subtle per-relation edge tint for the flow layout (falls back to the source node's
// colour for untyped links / the other graphs).
const RELATION_COLOR: Record<string, string> = {
  // campaign attack chain
  has_vuln: "#fbbf24", // platform → CVE (gold)
  exploited_by: "#ff6b6b", // CVE → actor (red — the exploitation step)
  targeted_by: "#4dbcff", // platform → actor, no CVE (blue)
  // investigations / intel-graph
  operates_in: "#22d3ee", // country → actor (cyan)
  uses: "#818cf8", // actor → family (indigo)
  runs: "#f472b6", // actor → campaign (pink)
  uses_cve: "#fbbf24", // campaign → CVE (gold)
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
   * "flow" lays nodes out as left-to-right columns by their `layer` (0 = root),
   * with directional arrows — the attack-chain / rooted-flow reading.
   */
  layout?: "auto" | "flow";
  /**
   * How a hovered/selected node highlights the rest.
   * "neighbors" (default): only its direct neighbours (the campaign fallback graph).
   * "trail": the whole directional trail-web reachable along the edge orientation
   * (e.g. country → its actors → their CVEs → their platforms, and upstream), so an
   * analyst follows a full trail from a single node without hopping node-by-node.
   */
  highlightMode?: "neighbors" | "trail";
  /**
   * When true and a node is active, hide everything outside that node's trail so the
   * single trail-web stands alone (positions are kept, only visibility changes).
   * Only meaningful with highlightMode="trail".
   */
  isolateActive?: boolean;
  /**
   * Fill the parent container's height instead of using a fixed `height`. The canvas
   * height is measured from the container, so the graph fills a full-screen layout.
   */
  fillParent?: boolean;
  /**
   * Node types whose labels are always drawn, regardless of zoom or highlight — e.g.
   * ["country"] so countries stay findable in a dense graph.
   */
  alwaysLabelTypes?: string[];
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
  highlightMode = "neighbors",
  isolateActive = false,
  fillParent = false,
  alwaysLabelTypes,
}: KnowledgeGraphProps) {
  const alwaysLabelSet = useMemo(
    () => new Set(alwaysLabelTypes ?? []),
    [alwaysLabelTypes],
  );
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
  const [measuredHeight, setMeasuredHeight] = useState(height);
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

  // Measure the container so the canvas fills it responsively (both dimensions when
  // fillParent, so the graph can occupy a full-screen layout).
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r?.width) setWidth(Math.floor(r.width));
      if (fillParent && r?.height) setMeasuredHeight(Math.floor(r.height));
    });
    ro.observe(el);
    setWidth(Math.floor(el.clientWidth));
    if (fillParent && el.clientHeight) setMeasuredHeight(Math.floor(el.clientHeight));
    return () => ro.disconnect();
  }, [fillParent]);

  // Height actually handed to the canvas.
  const canvasHeight = fillParent ? measuredHeight : height;

  // Stable graphData reference (force-graph mutates node objects with x/y).
  const graphData = useMemo(
    () => ({
      nodes: nodes.map((n) => ({ ...n, val: Math.max(1, n.val ?? 4) })),
      links: links.map((l) => ({ ...l })),
    }),
    [nodes, links],
  );

  // Adjacency for highlighting. `neighbours` is undirected (1-hop, the default mode);
  // `fwdAdj`/`revAdj` are directed (source→target / target→source) and drive the
  // "trail" mode's transitive closure along the edge orientation.
  const { neighbours, fwdAdj, revAdj } = useMemo(() => {
    const und = new Map<string, Set<string>>();
    const fwd = new Map<string, Set<string>>();
    const rev = new Map<string, Set<string>>();
    const ensure = (m: Map<string, Set<string>>, id: string) =>
      m.get(id) ?? m.set(id, new Set()).get(id)!;
    for (const l of links) {
      const s = typeof l.source === "string" ? l.source : (l.source as any).id;
      const t = typeof l.target === "string" ? l.target : (l.target as any).id;
      ensure(und, s).add(t);
      ensure(und, t).add(s);
      ensure(fwd, s).add(t);
      ensure(rev, t).add(s);
    }
    return { neighbours: und, fwdAdj: fwd, revAdj: rev };
  }, [links]);

  const active = hoverId ?? highlightId;

  // The directional closure from a node: everything reachable downstream (following
  // edges source→target) plus everything upstream (following them in reverse). For a
  // country that is its whole actors→CVEs→platforms web; for a platform it walks up to
  // the countries. Bounded (platforms are sinks, no intra-layer edges).
  const closureFrom = useCallback(
    (id: string) => {
      const seen = new Set<string>([id]);
      const walk = (adj: Map<string, Set<string>>) => {
        const stack = [id];
        while (stack.length) {
          const cur = stack.pop()!;
          const nbrs = adj.get(cur);
          if (!nbrs) continue;
          nbrs.forEach((nxt) => {
            if (!seen.has(nxt)) {
              seen.add(nxt);
              stack.push(nxt);
            }
          });
        }
      };
      walk(fwdAdj);
      walk(revAdj);
      return seen;
    },
    [fwdAdj, revAdj],
  );

  // Highlight (dim the rest) follows the active node — hover or selection — for a quick
  // trail preview. Memoised per active node.
  const trailSet = useMemo(
    () => (highlightMode !== "trail" || !active ? null : closureFrom(active)),
    [highlightMode, active, closureFrom],
  );
  // Isolation (hide the rest) pins to the *selected* node only, so hovering doesn't
  // collapse the graph on every mouse-move.
  const isolateSet = useMemo(
    () => (highlightMode !== "trail" || !highlightId ? null : closureFrom(highlightId)),
    [highlightMode, highlightId, closureFrom],
  );

  const isLit = useCallback(
    (id: string) => {
      if (!active) return true;
      if (id === active) return true;
      if (trailSet) return trailSet.has(id);
      return neighbours.get(active)?.has(id) ?? false;
    },
    [active, trailSet, neighbours],
  );

  const linkLit = useCallback(
    (l: any) => {
      if (!active) return true;
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      // A trail edge connects two lit nodes; a 1-hop edge just touches the active node.
      if (trailSet) return trailSet.has(s) && trailSet.has(t);
      return s === active || t === active;
    },
    [active, trailSet],
  );

  // Isolate: when enabled with a node selected, only that node's trail set is visible.
  const nodeVisible = useCallback(
    (n: any) => (!isolateActive || !isolateSet ? true : isolateSet.has(n.id)),
    [isolateActive, isolateSet],
  );
  const linkVisible = useCallback(
    (l: any) => {
      if (!isolateActive || !isolateSet) return true;
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      return isolateSet.has(s) && isolateSet.has(t);
    },
    [isolateActive, isolateSet],
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

    // --- Flow: left-to-right layered columns by node.layer --------------------
    // The campaign chain / rooted investigation graphs read as a directional flow
    // (asset → CVE → actor; country → actor → family), not a cloud. Research (MITRE
    // Attack Flow; node-link-vs-Sankey study) shows a layered, directional layout is
    // best for the synoptic "how it unfolded" read. We place each node in the column
    // of its `layer` (0 = root, left), order within a column by a barycenter sweep to
    // reduce edge crossings, pin positions, and draw directional arrows.
    if (layout === "flow") {
      // Adjacency keyed by direction (parents = lower layer, children = higher).
      const parents = new Map<string, string[]>();
      const children = new Map<string, string[]>();
      for (const l of graphData.links as any[]) {
        const s = typeof l.source === "object" ? l.source.id : l.source;
        const t = typeof l.target === "object" ? l.target.id : l.target;
        (children.get(s) ?? children.set(s, []).get(s)!).push(t);
        (parents.get(t) ?? parents.set(t, []).get(t)!).push(s);
      }

      // Compact the present layer values to contiguous columns 0..C.
      const rawLayers = Array.from(new Set(nodes.map((nd: any) => nd.layer ?? 0))).sort(
        (a, b) => a - b,
      );
      const colOf = new Map<number, number>();
      rawLayers.forEach((lv, i) => colOf.set(lv, i));
      const columns: any[][] = rawLayers.map(() => []);
      nodes.forEach((nd: any) => columns[colOf.get(nd.layer ?? 0)!].push(nd));

      // Order each column: seed by id, then barycenter sweeps (each node's rank =
      // mean rank of its neighbours in the previous column) to minimise crossings.
      const rank = new Map<string, number>();
      const reindex = (col: any[]) => col.forEach((nd, i) => rank.set(nd.id, i));
      columns.forEach((col) => {
        col.sort((a, b) => String(a.id).localeCompare(String(b.id)));
        reindex(col);
      });
      for (let pass = 0; pass < 4; pass++) {
        const ltr = pass % 2 === 0;
        const seq = ltr ? columns.slice(1) : columns.slice(0, -1).reverse();
        const neigh = ltr ? parents : children;
        const bary = (nd: any) => {
          const ns = neigh.get(nd.id) ?? [];
          if (!ns.length) return rank.get(nd.id) ?? 0;
          return ns.reduce((s, n) => s + (rank.get(n) ?? 0), 0) / ns.length;
        };
        for (const col of seq) {
          col.sort((a, b) => bary(a) - bary(b));
          reindex(col);
        }
      }

      // Pin positions: x by column, y centred within the column. Spacing scales with
      // the busiest column so dense columns (e.g. many actors) don't overlap.
      const rLeaf = nodeRadius({ val: 6 });
      const rowGap = 2 * rLeaf + 26;
      const colGap = Math.max(150, 2 * rLeaf + 130);
      const colCount = columns.length;
      columns.forEach((col, ci) => {
        const x = (ci - (colCount - 1) / 2) * colGap;
        const y0 = -((col.length - 1) * rowGap) / 2; // centre the column vertically
        col.forEach((nd: any, ri) => {
          nd.fx = x;
          nd.fy = y0 + ri * rowGap;
        });
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
  }, [graphData, width, fgReady, layout]);

  // Small flows (campaign chain, investigations) label every node; a large flow
  // (the global intel-graph, 100+ nodes) reveals labels on zoom/hover to stay legible.
  const flowLabelAll = layout === "flow" && nodes.length <= 45;

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
      // Types flagged always-on (e.g. countries) keep their label at every zoom so they
      // stay findable; when a node is active we still defer to the trail-lit set so the
      // focused path reads cleanly.
      const alwaysLabel = alwaysLabelSet.has(node.type);
      const showLabel =
        active != null
          ? lit || alwaysLabel
          : alwaysLabel
            ? true
            : layout === "flow"
              ? flowLabelAll
                ? true // small flow — label every node
                : globalScale > 1.8 // dense flow (intel-graph): zoom/hover only
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
    [active, isLit, minimalLabels, layout, flowLabelAll, alwaysLabelSet],
  );

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", height: fillParent ? "100%" : height }}
    >
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
          height={canvasHeight}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={4}
          nodeVisibility={nodeVisible}
          linkVisibility={linkVisible}
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
            // Flow chain: tint each edge by its relation (exploited_by = red, …) so the
            // attack path reads at a glance; otherwise fall back to the source node's
            // entity colour (intel-graph / star graphs).
            const relColor = l.relation ? RELATION_COLOR[l.relation] : undefined;
            const base = relColor ?? entityColor(typeof l.source === "object" ? l.source.type : "incident");
            return base + (layout === "flow" ? "cc" : "77");
          }}
          linkWidth={(l: any) => {
            if (!linkLit(l)) return 0.4;
            // Emphasise the exploitation step in the chain.
            return l.relation === "exploited_by" ? 1.8 : layout === "flow" ? 1.2 : 1;
          }}
          // Directional arrowheads make the flow read as a directed chain.
          linkDirectionalArrowLength={layout === "flow" ? 4 : 0}
          linkDirectionalArrowRelPos={0.92}
          linkDirectionalArrowColor={(l: any) => {
            const relColor = l.relation ? RELATION_COLOR[l.relation] : undefined;
            return relColor ?? entityColor(typeof l.source === "object" ? l.source.type : "incident");
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
