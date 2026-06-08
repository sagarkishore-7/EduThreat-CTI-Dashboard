"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getCampaigns,
  getCampaignDetail,
  type CampaignSummary,
} from "@/lib/api";
import { PageSkeleton } from "@/components/PageHeader";
import { Card, CardHead, CardBody } from "@/components/ui/Card";
import { formatNumber, formatPercent, getCountryFlag } from "@/lib/utils";
import { AlertTriangle, Share2, Layers, Building2, Crosshair } from "lucide-react";

const KnowledgeGraph = dynamic(
  () => import("@/components/charts/KnowledgeGraph").then((m) => m.KnowledgeGraph),
  { ssr: false },
);

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

export default function CampaignsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => getCampaigns(60),
    refetchInterval: 120_000,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const campaigns = useMemo(() => data?.items ?? [], [data]);

  // Group campaigns into related families so fragments of one real campaign
  // (e.g. the actor "wave" and CVE "exposure" views of the same event) render as
  // one entry instead of duplicate rows. Falls back to one-campaign-per-family
  // when metadata.family_id is absent (older data), so behaviour is unchanged
  // until the backend correlation rerun populates it.
  const families = useMemo(() => buildFamilies(campaigns), [campaigns]);

  const counts = useMemo(() => {
    const byType: Record<string, number> = {};
    let members = 0;
    for (const f of families) {
      byType[f.primary.campaign_type] = (byType[f.primary.campaign_type] || 0) + 1;
      members += f.primary.member_count; // primary only — fragments overlap
    }
    return { byType, members };
  }, [families]);

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

  const selected = selectedId ?? families[0]?.primary.campaign_id ?? null;

  return (
    <div className="animate-fade-in space-y-3.5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Campaigns", value: formatNumber(families.length), icon: Layers, accent: "var(--brand)" },
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
            {families.map((f) => (
              <FamilyRow
                key={f.familyId}
                family={f}
                selected={selected}
                onSelect={(id) => setSelectedId(id)}
              />
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

interface Family {
  familyId: string;
  primary: CampaignSummary;
  related: CampaignSummary[]; // non-primary fragments of the same real campaign
}

function buildFamilies(campaigns: CampaignSummary[]): Family[] {
  const groups = new Map<string, CampaignSummary[]>();
  for (const c of campaigns) {
    const fid = (c.metadata?.["family_id"] as string | undefined) || c.campaign_id;
    (groups.get(fid) ?? groups.set(fid, []).get(fid)!).push(c);
  }
  const families: Family[] = [];
  for (const [familyId, members] of Array.from(groups.entries())) {
    // Primary = flagged primary, else the largest membership.
    const sorted = [...members].sort((a, b) => b.member_count - a.member_count);
    const primary =
      members.find((m: CampaignSummary) => m.metadata?.["is_primary_in_family"] === true) ?? sorted[0];
    const related = sorted.filter((m: CampaignSummary) => m.campaign_id !== primary.campaign_id);
    families.push({ familyId, primary, related });
  }
  // Order by the primary's membership, like the original list ordering.
  return families.sort((a, b) => b.primary.member_count - a.primary.member_count);
}

function FamilyRow({
  family,
  selected,
  onSelect,
}: {
  family: Family;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const { primary, related } = family;
  const activeId = [primary, ...related].some((c) => c.campaign_id === selected)
    ? selected
    : null;
  return (
    <div className="border-b border-zinc-800/70">
      <CampaignRow
        c={primary}
        active={primary.campaign_id === selected}
        bordered={false}
        onClick={() => onSelect(primary.campaign_id)}
      />
      {related.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-2.5 -mt-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Related views</span>
          {related.map((r) => (
            <button
              key={r.campaign_id}
              onClick={() => onSelect(r.campaign_id)}
              className={
                "rounded border px-1.5 py-0.5 text-[10px] transition-colors " +
                (r.campaign_id === activeId
                  ? "border-emerald-400/40 text-emerald-300"
                  : "border-zinc-800 text-zinc-400 hover:border-emerald-400/30 hover:text-emerald-300")
              }
              title={r.campaign_name}
            >
              {TYPE_LABEL[r.campaign_type] || r.campaign_type}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignRow({ c, active, onClick, bordered = true }: { c: CampaignSummary; active: boolean; onClick: () => void; bordered?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={
        "block w-full px-3.5 py-3 text-left transition-colors " +
        (bordered ? "border-b border-zinc-800/70 " : "") +
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
        nodes: graphQuery.data.nodes.map((n) => ({
          id: n.id,
          label: n.label,
          type: n.type,
          val: Math.max(3, n.size),
        })),
        links: graphQuery.data.edges.map((e) => ({ source: e.source, target: e.target })),
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
          <div className="rounded-lg border border-zinc-800/70 bg-[#0a0c14]">
            <KnowledgeGraph nodes={graph.nodes} links={graph.links} height={420} />
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
