"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getThreatActors } from "@/lib/api";
import { PageSkeleton } from "@/components/PageHeader";
import { Card, CardHead, CardBody } from "@/components/ui/Card";
import { formatNumber, getCountryFlag } from "@/lib/utils";
import { Share2 } from "lucide-react";

import type { ResponsiveNetwork as ResponsiveNetworkType } from "@nivo/network";

const ResponsiveNetwork = dynamic(
  () => import("@nivo/network").then((m) => m.ResponsiveNetwork),
  { ssr: false },
) as typeof ResponsiveNetworkType;

interface GNode {
  id: string;
  kind: "actor" | "country" | "family";
  size: number;
  color: string;
}
interface GLink {
  source: string;
  target: string;
  distance: number;
}

const COLOR = { actor: "#ff4757", country: "#00d8b4", family: "#818cf8" };

export default function InvestigationsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["threat-actors", 14], queryFn: () => getThreatActors(14) });
  const [selected, setSelected] = useState<string | null>(null);

  const graph = useMemo(() => {
    const actors = (data?.threat_actors ?? []).filter((a) => a.name && a.name.toLowerCase() !== "unknown").slice(0, 12);
    const nodeMap = new Map<string, GNode>();
    const links: GLink[] = [];
    const add = (id: string, kind: GNode["kind"], size: number) => {
      if (!nodeMap.has(id)) nodeMap.set(id, { id, kind, size, color: COLOR[kind] });
    };
    for (const a of actors) {
      add(a.name, "actor", Math.min(28, 12 + a.incident_count));
      for (const c of (a.countries_targeted || []).slice(0, 4)) {
        if (!c) continue;
        add(c, "country", 8);
        links.push({ source: a.name, target: c, distance: 50 });
      }
      for (const fam of (a.ransomware_families || []).slice(0, 3)) {
        if (!fam) continue;
        add(`${fam} (family)`, "family", 7);
        links.push({ source: a.name, target: `${fam} (family)`, distance: 45 });
      }
    }
    return { nodes: Array.from(nodeMap.values()), links };
  }, [data]);

  if (isLoading) return <PageSkeleton rows={4} />;

  const actors = (data?.threat_actors ?? []).slice(0, 12);
  const selectedActor = actors.find((a) => a.name === selected);

  return (
    <div className="animate-fade-in space-y-3.5">
      <Card>
        <CardHead
          title="Investigation Canvas"
          sub="Actor → geography → ransomware-family relationship graph from the canonical set"
          accentDot="pulse"
          actions={
            <div className="flex items-center gap-3 text-[10.5px] text-zinc-400">
              <span className="inline-flex items-center gap-1.5"><span className="dot" style={{ background: COLOR.actor }} /> Actor</span>
              <span className="inline-flex items-center gap-1.5"><span className="dot" style={{ background: COLOR.country }} /> Country</span>
              <span className="inline-flex items-center gap-1.5"><span className="dot" style={{ background: COLOR.family }} /> Family</span>
            </div>
          }
        />
        <CardBody className="p-0">
          <div className="grid xl:grid-cols-[1fr_320px]">
            <div className="h-[520px] border-b border-zinc-800/70 xl:border-b-0 xl:border-r">
              {graph.nodes.length > 0 ? (
                <ResponsiveNetwork<GNode, GLink>
                  data={graph}
                  margin={{ top: 12, right: 12, bottom: 12, left: 12 }}
                  linkDistance={(l) => l.distance}
                  centeringStrength={0.32}
                  repulsivity={26}
                  nodeSize={(n) => n.size}
                  activeNodeSize={(n) => n.size * 1.4}
                  nodeColor={(n) => n.color}
                  nodeBorderWidth={1}
                  nodeBorderColor={{ from: "color", modifiers: [["darker", 0.6]] }}
                  linkColor={{ from: "source.color", modifiers: [["opacity", 0.35]] }}
                  linkThickness={1}
                  onClick={(n) => {
                    if (n.data.kind === "actor") setSelected(n.data.id);
                  }}
                />
              ) : (
                <div className="grid h-full place-items-center text-sm text-zinc-600">No relationship data available.</div>
              )}
            </div>

            <div className="p-3.5">
              {selectedActor ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Inspector</p>
                  <h3 className="mt-1 text-lg font-semibold text-zinc-100">{selectedActor.name}</h3>
                  <div className="mt-3 space-y-2 text-[12px]">
                    <Row label="Incidents" value={formatNumber(selectedActor.incident_count)} />
                    <Row label="Countries" value={formatNumber(selectedActor.countries_targeted.length)} />
                    <Row label="Families" value={formatNumber(selectedActor.ransomware_families.filter(Boolean).length)} />
                  </div>
                  <div className="mt-3">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">Targeted geography</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedActor.countries_targeted.slice(0, 8).map((c) => (
                        <span key={c} className="pill pill-brand">
                          {getCountryFlag(c)} {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/incidents?search=${encodeURIComponent(selectedActor.name)}`}
                    className="ops-chip ops-chip-brand mt-4 inline-flex"
                  >
                    View incidents →
                  </Link>
                </div>
              ) : (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <Share2 className="mx-auto mb-2 h-8 w-8 text-zinc-700" />
                    <p className="text-[12px] text-zinc-500">Select an actor node to inspect its targeting and pivots.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHead title="Tracked Actors" sub={`${formatNumber(data?.total ?? 0)} attributed groups in the canonical set`} />
        <CardBody className="p-0">
          <table className="ops-table text-[12px]">
            <thead>
              <tr>
                <th>Actor</th>
                <th className="text-right">Incidents</th>
                <th className="text-right">Countries</th>
                <th>Families</th>
              </tr>
            </thead>
            <tbody>
              {actors.map((a) => (
                <tr key={a.name} className="cursor-pointer" onClick={() => setSelected(a.name)}>
                  <td className="font-medium text-zinc-100">{a.name}</td>
                  <td className="text-right font-mono text-red-300">{formatNumber(a.incident_count)}</td>
                  <td className="text-right font-mono text-emerald-300">{formatNumber(a.countries_targeted.length)}</td>
                  <td className="text-zinc-500">{a.ransomware_families.filter(Boolean).slice(0, 3).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-1.5">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono text-zinc-200">{value}</span>
    </div>
  );
}
