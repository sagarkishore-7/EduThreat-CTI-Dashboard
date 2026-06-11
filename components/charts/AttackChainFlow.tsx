"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { entityColor, entityIcon, relationColor } from "@/lib/entity-style";
import type { CampaignGraphNode, CampaignGraphEdge, CampaignVictimGroup } from "@/lib/api";

// A directional attack-flow stepper (MITRE-Attack-Flow style) for a single campaign:
// asset (platform/vendor) → CVE → actor, read left-to-right, with curved SVG connectors
// whose thickness encodes downstream volume. Crisp DOM cards (lucide icons + real text),
// not a canvas force-graph. Hovering a card lights its full path; clicking an asset/actor
// cross-filters the affected-institutions grid below.

interface FlowNode {
  id: string;
  label: string;
  type: string;
  layer: number;
  size: number;
  vendor?: string;
}

export interface AttackChainFlowProps {
  nodes: CampaignGraphNode[];
  edges: CampaignGraphEdge[];
  victimGroups: CampaignVictimGroup[];
  /** The campaign's authoritative attributed actors — the chain shows only these. */
  campaignActors?: string[];
  /** Currently cross-filtered group key (asset/actor node id), or null. */
  activeKey?: string | null;
  /** Fired when a card is clicked (its node id) or null to clear. */
  onFocus?: (key: string | null) => void;
}

const COL_LABEL: Record<number, string> = { 0: "Asset", 1: "Vulnerability", 2: "Threat actor" };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function AttackChainFlow({ nodes, edges, victimGroups, campaignActors, activeKey = null, onFocus }: AttackChainFlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [paths, setPaths] = useState<Array<{ d: string; color: string; width: number; key: string; lit: boolean }>>([]);
  const [boxH, setBoxH] = useState(0);

  // victim count reachable through each asset node (for the asset card badge + connector width).
  const victimCountByAsset = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of victimGroups) m.set(g.key, g.count);
    return m;
  }, [victimGroups]);

  // The chain shows only the campaign's attributed actors. The backend graph unions in
  // every per-incident actor seen in member evidence, so an actor_activity_wave (defined
  // by ONE actor) accretes co-mentioned actors — the graph showed 7 actors for a "Qilin
  // wave". Constrain actor-layer nodes to `campaignActors` (the authoritative list); drop
  // the rest + their edges. mass_exploitation keeps its full multi-actor list (those ARE
  // in campaignActors). No-op when campaignActors is absent.
  const { keptNodes, keptEdges } = useMemo(() => {
    const actorSet = campaignActors ? new Set(campaignActors.map(norm)) : null;
    const allowed = new Set<string>();
    for (const n of nodes) {
      const isActor = n.type === "actor";
      if (isActor && actorSet && !actorSet.has(norm(n.label))) continue;
      allowed.add(n.id);
    }
    const ke = edges.filter((e) => allowed.has(e.source) && allowed.has(e.target));
    // Drop orphans (no surviving edge): downstream victim orgs (TIAA, NSC, CDW) leak into a
    // campaign's vendor list and become layer-0 asset nodes with no connecting edge.
    const connected = new Set<string>();
    for (const e of ke) {
      connected.add(e.source);
      connected.add(e.target);
    }
    const kn = nodes.filter((n) => allowed.has(n.id) && connected.has(n.id));
    return { keptNodes: kn, keptEdges: ke };
  }, [nodes, edges, campaignActors]);

  const columns = useMemo(() => {
    const byLayer = new Map<number, FlowNode[]>();
    for (const n of keptNodes) {
      const fn: FlowNode = {
        id: n.id,
        label: n.label,
        type: n.type,
        layer: n.layer ?? 0,
        size: n.size ?? 4,
        vendor: (n.metadata as { vendor?: string } | undefined)?.vendor,
      };
      const arr = byLayer.get(fn.layer) ?? [];
      arr.push(fn);
      byLayer.set(fn.layer, arr);
    }
    return Array.from(byLayer.keys())
      .sort((a, b) => a - b)
      .map((layer) => ({ layer, nodes: (byLayer.get(layer) ?? []).sort((a, b) => b.size - a.size) }));
  }, [keptNodes]);

  // adjacency for path highlighting
  const neighbours = useMemo(() => {
    const m = new Map<string, Set<string>>();
    const ensure = (id: string) => m.get(id) ?? m.set(id, new Set()).get(id)!;
    for (const e of keptEdges) {
      ensure(e.source).add(e.target);
      ensure(e.target).add(e.source);
    }
    return m;
  }, [keptEdges]);

  const active = hoverId ?? activeKey;
  const isLit = useCallback(
    (id: string) => !active || id === active || (neighbours.get(active)?.has(id) ?? false),
    [active, neighbours],
  );

  // Compute SVG connector paths from rendered card geometry (measured, so it stays correct
  // across responsive reflow). Recomputed on layout changes + resize.
  const recompute = useCallback(() => {
    const host = containerRef.current;
    if (!host) return;
    const hostBox = host.getBoundingClientRect();
    setBoxH(host.offsetHeight);
    const maxDownstream = Math.max(1, ...victimGroups.map((g) => g.count), ...keptNodes.map((n) => n.size ?? 0));
    const next: Array<{ d: string; color: string; width: number; key: string; lit: boolean }> = [];
    for (const e of keptEdges) {
      const a = cardRefs.current.get(e.source);
      const b = cardRefs.current.get(e.target);
      if (!a || !b) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      // vertical (mobile, stacked) vs horizontal (desktop)
      const vertical = rb.top - ra.top > Math.abs(rb.left - ra.left);
      let x1, y1, x2, y2;
      if (vertical) {
        x1 = ra.left + ra.width / 2 - hostBox.left;
        y1 = ra.bottom - hostBox.top;
        x2 = rb.left + rb.width / 2 - hostBox.left;
        y2 = rb.top - hostBox.top;
      } else {
        x1 = ra.right - hostBox.left;
        y1 = ra.top + ra.height / 2 - hostBox.top;
        x2 = rb.left - hostBox.left;
        y2 = rb.top + rb.height / 2 - hostBox.top;
      }
      const mx = (x1 + x2) / 2;
      const d = vertical
        ? `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`
        : `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
      // downstream weight: victims through this asset, else target node size
      const downstream = victimCountByAsset.get(e.source) ?? victimCountByAsset.get(e.target) ?? 0;
      const w = 1.4 + 4.6 * Math.sqrt(Math.max(downstream, 1) / maxDownstream);
      const lit = isLit(e.source) && isLit(e.target);
      next.push({
        d,
        color: relationColor(e.relation ?? (e.type as string | undefined), undefined),
        width: e.relation === "exploited_by" ? w + 0.6 : w,
        key: `${e.source}->${e.target}`,
        lit,
      });
    }
    setPaths(next);
  }, [keptEdges, keptNodes, victimGroups, victimCountByAsset, isLit]);

  useEffect(() => {
    recompute();
    const ro = new ResizeObserver(() => recompute());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [recompute]);

  const totalVictims = victimGroups.reduce((s, g) => s + g.count, 0);

  return (
    <div ref={containerRef} className="relative">
      {/* connectors layer */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ height: boxH || undefined }}>
        {paths.map((p) => (
          <motion.path
            key={p.key}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={p.width}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: p.lit ? 0.85 : active ? 0.12 : 0.5 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </svg>

      {/* columns */}
      <div className="relative flex flex-col gap-5 md:flex-row md:items-stretch md:gap-0">
        {columns.map((col, ci) => (
          <div key={col.layer} className="flex flex-1 flex-col md:px-2" style={{ zIndex: 1 }}>
            <div className="mb-2 text-center text-[9.5px] font-semibold uppercase tracking-wider text-zinc-600">
              {COL_LABEL[col.layer] ?? `Stage ${col.layer + 1}`}
            </div>
            <div className="flex flex-col gap-2.5">
              {col.nodes.map((n, ni) => {
                const Icon = entityIcon(n.type);
                const color = entityColor(n.type);
                const lit = isLit(n.id);
                const clickable = col.layer === 0 || (col.layer === columns.length - 1);
                const badge =
                  col.layer === 0
                    ? victimCountByAsset.get(n.id)
                    : col.layer === 2
                      ? Math.max(0, n.size - 14) || undefined
                      : undefined;
                const focused = activeKey === n.id;
                return (
                  <motion.button
                    key={n.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(n.id, el);
                      else cardRefs.current.delete(n.id);
                    }}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: lit ? 1 : 0.32, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05 * ci + 0.04 * ni }}
                    onMouseEnter={() => setHoverId(n.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={() => clickable && onFocus?.(focused ? null : n.id)}
                    className={[
                      "group flex items-center gap-2.5 rounded-lg border bg-[#0c1018] px-3 py-2 text-left transition-colors",
                      clickable ? "cursor-pointer" : "cursor-default",
                      focused ? "ring-1" : "",
                    ].join(" ")}
                    style={{
                      borderColor: (focused ? color : color + "44"),
                      boxShadow: focused ? `0 0 0 1px ${color}` : undefined,
                    }}
                  >
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-md"
                      style={{ background: color + "22", color }}
                    >
                      <Icon size={13} strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className="block text-[11.5px] font-medium leading-tight text-zinc-100"
                        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                        title={n.label}
                      >
                        {n.label}
                      </span>
                      {n.vendor && (
                        <span className="block truncate text-[9.5px] text-zinc-500" title={n.vendor}>
                          {n.vendor}
                        </span>
                      )}
                    </span>
                    {badge ? (
                      <span
                        className="shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold tabular-nums"
                        style={{ background: color + "22", color }}
                        title={col.layer === 0 ? `${badge} affected institutions` : `${badge} incidents`}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}

        {/* terminal: a compact end-cap (the full affected-institutions grid renders below) */}
        {totalVictims > 0 && (
          <div className="flex shrink-0 flex-col md:w-[84px] md:px-1" style={{ zIndex: 1 }}>
            <div className="mb-2 text-center text-[9.5px] font-semibold uppercase tracking-wider text-zinc-600">
              Affected
            </div>
            <div className="flex h-full min-h-[52px] items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-2 py-2 text-center">
              <span>
                <span className="block text-base font-semibold tabular-nums text-emerald-300">{totalVictims}</span>
                <span className="block text-[9px] text-zinc-500">victims</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
