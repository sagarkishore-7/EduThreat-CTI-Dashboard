"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getCampaigns,
  getCampaignDetail,
  type CampaignSummary,
  type CampaignGraphNode,
} from "@/lib/api";
import { PageSkeleton } from "@/components/PageHeader";
import { Card, CardHead, CardBody } from "@/components/ui/Card";
import { formatNumber, formatPercent, getCountryFlag } from "@/lib/utils";
import { AlertTriangle, Share2, Layers, Building2, Crosshair } from "lucide-react";

import type { ResponsiveNetwork as ResponsiveNetworkType } from "@nivo/network";

const ResponsiveNetwork = dynamic(
  () => import("@nivo/network").then((m) => m.ResponsiveNetwork),
  { ssr: false },
) as typeof ResponsiveNetworkType;

interface GNode {
  id: string;
  type: string;
  label: string;
  size: number;
  color: string;
}
interface GLink {
  source: string;
  target: string;
  distance: number;
}

const TYPE_LABEL: Record<string, string> = {
  mass_exploitation: "Mass Exploitation",
  shared_vendor_incident: "Shared Vendor",
  same_campaign: "Same Campaign",
  actor_activity_wave: "Actor Wave",
  roundup_not_campaign: "Roundup",
  unrelated: "Unrelated",
};
const TYPE_PILL: Record<string, string> = {
  mass_exploitation: "pill-threat",
  shared_vendor_incident: "pill-warn",
  same_campaign: "pill-pulse",
  actor_activity_wave: "pill-info",
};
const ROLE_PILL: Record<string, string> = {
  vendor_operator: "pill-warn",
  affected_via_vendor: "pill-info",
  direct_victim: "pill-threat",
  mentioned_only: "pill-mute",
  needs_review: "pill-mute",
};
const ROLE_LABEL: Record<string, string> = {
  vendor_operator: "Vendor",
  affected_via_vendor: "Via Vendor",
  direct_victim: "Direct Victim",
  mentioned_only: "Mentioned",
  needs_review: "Needs Review",
};

const NODE_COLOR: Record<string, string> = {
  campaign: "#00d8b4",
  vendor: "#ff8c42",
  actor: "#ff4757",
  cve_or_product: "#ffd93d",
  platform: "#818cf8",
  incident: "#4dbcff",
};

export default function CampaignsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => getCampaigns(60),
    refetchInterval: 120_000,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const campaigns = useMemo(() => data?.items ?? [], [data]);
  const counts = useMemo(() => {
    const byType: Record<string, number> = {};
    let members = 0;
    for (const c of campaigns) {
      byType[c.campaign_type] = (byType[c.campaign_type] || 0) + 1;
      members += c.member_count;
    }
    return { byType, members };
  }, [campaigns]);

  if (isLoading) return <PageSkeleton rows={4} />;
  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="ops-panel max-w-lg px-6 py-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h2 className="mb-2 text-lg font-semibold text-zinc-100">Campaigns unavailable</h2>
          <p className="text-sm text-zinc-500">The campaign correlation endpoint could not be reached.</p>
        </div>
      </div>
    );
  }

  const selected = selectedId ?? campaigns[0]?.campaign_id ?? null;

  return (
    <div className="animate-fade-in space-y-3.5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Campaigns", value: formatNumber(campaigns.length), icon: Layers, accent: "var(--brand)" },
          { label: "Linked Incidents", value: formatNumber(counts.members), icon: Building2, accent: "var(--pulse)" },
          { label: "Mass Exploitation", value: formatNumber(counts.byType.mass_exploitation || 0), icon: Crosshair, accent: "var(--threat)" },
          { label: "Vendor Incidents", value: formatNumber(counts.byType.shared_vendor_incident || 0), icon: Share2, accent: "var(--warn)" },
        ].map((k) => (
          <Card key={k.label}>
            <CardBody className="py-3">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{k.label}</span>
                <span className="kpi-icon" style={{ ["--c" as string]: k.accent }}><k.icon className="h-3.5 w-3.5" /></span>
              </div>
              <div className="kpi-val mt-2 text-2xl" style={{ ["--c" as string]: k.accent }}>{k.value}</div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1.25fr]">
        {/* Campaign list */}
        <Card className="flex max-h-[760px] flex-col">
          <CardHead title="Correlated Campaigns" sub="Deterministic clusters · click to inspect" accentDot="brand" />
          <div className="flex-1 overflow-y-auto">
            {campaigns.map((c) => (
              <CampaignRow key={c.campaign_id} c={c} active={c.campaign_id === selected} onClick={() => setSelectedId(c.campaign_id)} />
            ))}
          </div>
        </Card>

        {/* Detail */}
        {selected ? <CampaignDetail id={selected} /> : (
          <Card><CardBody>Select a campaign.</CardBody></Card>
        )}
      </div>
    </div>
  );
}

function CampaignRow({ c, active, onClick }: { c: CampaignSummary; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        "block w-full border-b border-zinc-800/70 px-3.5 py-3 text-left transition-colors " +
        (active ? "bg-emerald-400/10" : "hover:bg-[#161a26]")
      }
    >
      <div className="mb-1 flex items-center gap-2">
        <span className={`pill ${TYPE_PILL[c.campaign_type] || "pill-mute"}`}>{TYPE_LABEL[c.campaign_type] || c.campaign_type}</span>
        {c.status === "candidate" && <span className="pill pill-mute">Candidate</span>}
        <span className="ml-auto font-mono text-[10px] text-zinc-500">{c.confidence !== null ? formatPercent(c.confidence * 100, 0) : "—"}</span>
      </div>
      <div className="truncate text-[13px] font-semibold text-zinc-100">{c.campaign_name}</div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] text-zinc-500">
        <span className="font-mono text-zinc-300">{formatNumber(c.member_count)}</span> incidents
        {c.actors.slice(0, 2).map((a) => <span key={a} className="pill pill-threat">{a}</span>)}
        {c.vendors.slice(0, 1).map((v) => <span key={v} className="pill pill-warn">{v}</span>)}
        {c.cves.slice(0, 1).map((cve) => <span key={cve} className="pill pill-watch normal-case tracking-normal">{cve}</span>)}
      </div>
    </button>
  );
}

function CampaignDetail({ id }: { id: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["campaign", id], queryFn: () => getCampaignDetail(id) });
  const graphQuery = useQuery({
    queryKey: ["campaign-graph", id],
    queryFn: () => import("@/lib/api").then((m) => m.getCampaignGraph(id)),
  });

  if (isLoading || !data) return <Card><CardBody><div className="h-64 animate-pulse rounded bg-zinc-900/40" /></CardBody></Card>;
  const c = data.campaign;
  const members = data.memberships;
  const byRole = members.reduce<Record<string, typeof members>>((acc, m) => {
    (acc[m.role] ||= []).push(m);
    return acc;
  }, {});
  const graph = graphQuery.data
    ? {
        nodes: graphQuery.data.nodes.map((n) => ({ ...n, color: NODE_COLOR[n.type] || "#8189a0" })),
        links: graphQuery.data.edges.map((e) => ({ source: e.source, target: e.target, distance: 50 })),
      }
    : null;

  return (
    <Card className="flex flex-col">
      <CardHead
        title={c.campaign_name}
        sub={c.analyst_summary || `${TYPE_LABEL[c.campaign_type]} · ${formatNumber(c.member_count)} incidents`}
        actions={
          <span className="flex items-center gap-2">
            <span className={`pill ${TYPE_PILL[c.campaign_type] || "pill-mute"}`}>{TYPE_LABEL[c.campaign_type]}</span>
            <span className="ops-chip ops-chip-brand">{c.confidence !== null ? formatPercent(c.confidence * 100, 0) : "—"} conf</span>
          </span>
        }
      />
      <CardBody className="space-y-3.5">
        {/* Attribution chips */}
        <div className="flex flex-wrap gap-1.5">
          {c.actors.map((a) => <span key={a} className="pill pill-threat">{a}</span>)}
          {c.vendors.map((v) => <span key={v} className="pill pill-warn">{v}</span>)}
          {c.cves.map((cve) => <span key={cve} className="pill pill-watch normal-case tracking-normal">{cve}</span>)}
          {c.platforms.map((p) => <span key={p} className="pill pill-pulse">{p}</span>)}
        </div>

        {/* Relationship graph */}
        {graph && graph.nodes.length > 1 && (
          <div className="h-[280px] rounded-lg border border-zinc-800/70 bg-[#0a0c14]">
            <ResponsiveNetwork<GNode, GLink>
              data={graph}
              margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
              linkDistance={(l) => l.distance}
              centeringStrength={0.4}
              repulsivity={24}
              nodeSize={(n) => Math.min(22, 6 + n.size / 4)}
              activeNodeSize={(n) => Math.min(30, 8 + n.size / 3)}
              nodeColor={(n) => n.color}
              nodeBorderWidth={1}
              nodeBorderColor={{ from: "color", modifiers: [["darker", 0.6]] }}
              linkColor={{ from: "source.color", modifiers: [["opacity", 0.3]] }}
              linkThickness={1}
            />
          </div>
        )}

        {/* Victim universities by role */}
        <div className="space-y-3">
          {(["vendor_operator", "direct_victim", "affected_via_vendor"] as const).map((role) => {
            const rows = byRole[role];
            if (!rows || rows.length === 0) return null;
            return (
              <div key={role}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className={`pill ${ROLE_PILL[role]}`}>{ROLE_LABEL[role]}</span>
                  <span className="text-[10.5px] text-zinc-500">{formatNumber(rows.length)} institution{rows.length === 1 ? "" : "s"}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rows.map((m) => (
                    <a
                      key={m.membership_id}
                      href={`/incidents/${m.canonical_incident_id}`}
                      className="rounded border border-zinc-800/70 bg-zinc-900/40 px-2 py-1 text-[11px] text-zinc-200 transition-colors hover:border-emerald-400/30 hover:text-emerald-300"
                    >
                      {m.victim_name || "Unknown"}
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
