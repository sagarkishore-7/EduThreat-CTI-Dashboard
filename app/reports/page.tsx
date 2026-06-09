"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getDashboard, getThreatActors, API_BASE } from "@/lib/api";
import { ReportsSkeleton } from "@/components/ui/Skeleton";
import { Card, CardHead, CardBody } from "@/components/ui/Card";
import { TlpBadge, deriveTlp } from "@/components/ui/TlpBadge";
import { SeverityPill, severityFromCategory } from "@/components/ui/SeverityPill";
import { formatDate, formatNumber, getCountryFlag, truncate } from "@/lib/utils";
import { FileText, Users, Megaphone, ShieldAlert, FileSpreadsheet, Download, ArrowRight } from "lucide-react";

const TEMPLATES = [
  { name: "Campaign Report", desc: "Correlated multi-incident campaign with attribution and TTP overlap", icon: ShieldAlert, accent: "var(--threat)" },
  { name: "Sector Advisory", desc: "Education-sector advisory with priority findings and guidance", icon: Megaphone, accent: "var(--warn)" },
  { name: "Actor Profile", desc: "Threat-actor dossier: targeting, families, and timeline", icon: Users, accent: "var(--pulse)" },
  { name: "Weekly Bulletin", desc: "Rolling 7-day digest of new and escalated incidents", icon: FileText, accent: "var(--brand)" },
  { name: "Post-Incident", desc: "Structured case file with impact, recovery, and lessons", icon: FileSpreadsheet, accent: "var(--info)" },
];

export default function ReportsPage() {
  const dashQuery = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard });
  const actorsQuery = useQuery({ queryKey: ["threat-actors", 6], queryFn: () => getThreatActors(6) });

  if (dashQuery.isLoading) return <ReportsSkeleton />;
  if (!dashQuery.data) return null;

  const data = dashQuery.data;
  const intel = data.intelligence_summary;
  const findings = intel.priority_findings.slice(0, 4);
  const bulletins = data.recent_incidents.slice(0, 6);
  const actors = actorsQuery.data?.threat_actors ?? [];

  return (
    <div className="animate-fade-in space-y-3.5">
      {/* Templates */}
      <Card>
        <CardHead title="Report Templates" sub="Generate a structured CTI product" />
        <CardBody>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            {TEMPLATES.map((t) => (
              <button
                key={t.name}
                className="card-hover rounded-lg border border-zinc-800/70 bg-zinc-900/30 p-3 text-left"
              >
                <span className="kpi-icon" style={{ ["--c" as string]: t.accent }}>
                  <t.icon className="h-3.5 w-3.5" />
                </span>
                <div className="mt-2.5 text-[13px] font-semibold text-zinc-100">{t.name}</div>
                <div className="mt-1 text-[11px] leading-snug text-zinc-500">{t.desc}</div>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        {/* Bulletins from recent incidents */}
        <Card>
          <CardHead title="Incident Bulletins" sub="Auto-drafted from recent canonical incidents" accentDot="threat" />
          <CardBody className="space-y-2.5">
            {bulletins.map((b) => {
              const sev = severityFromCategory(b.attack_category);
              const tlp = deriveTlp({ attackCategory: b.attack_category, severity: sev, hasLeakSite: Boolean(b.ransomware_family) });
              return (
                <div key={b.incident_id} className="rounded-lg border border-zinc-800/70 bg-zinc-900/30 p-3">
                  <div className="mb-1.5 flex items-center gap-2">
                    <SeverityPill severity={sev} />
                    <span className="text-[13px] leading-none">{getCountryFlag(b.country)}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-zinc-100">{b.institution_name}</span>
                    <TlpBadge level={tlp} />
                  </div>
                  <p className="mb-2 text-[11.5px] leading-snug text-zinc-400">{truncate(b.enriched_summary || b.title || "", 150)}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-zinc-600">{formatDate(b.incident_date)}</span>
                    <a
                      href={`${API_BASE}/api/v2/incidents/${b.incident_id}/report`}
                      target="_blank"
                      rel="noreferrer"
                      className="ops-chip ops-chip-brand"
                    >
                      <Download className="h-3 w-3" /> Export
                    </a>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <div className="space-y-3">
          {/* Sector advisories from priority findings */}
          <Card>
            <CardHead title="Sector Advisories" sub="Derived from priority findings" accentDot="brand" />
            <CardBody className="space-y-2.5">
              {findings.map((f) => (
                <div key={f.title} className="rounded-lg border border-zinc-800/70 bg-zinc-900/30 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{f.title}</p>
                    <TlpBadge level="green" />
                  </div>
                  <p className="mt-1.5 text-[15px] font-semibold text-zinc-100">{f.value}</p>
                  <p className="mt-1 text-[11.5px] leading-snug text-zinc-500">{f.context}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Actor profiles */}
          <Card>
            <CardHead title="Actor Profiles" sub="Most active attributed groups" accentDot="pulse" />
            <CardBody className="space-y-1.5">
              {actors.map((a) => (
                <Link
                  key={a.name}
                  href={`/incidents?search=${encodeURIComponent(a.name)}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-800/70 bg-zinc-900/30 px-3 py-2.5 transition-colors hover:border-indigo-400/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-zinc-100">{a.name}</p>
                    <p className="text-[10.5px] text-zinc-500">{a.countries_targeted.slice(0, 3).join(" · ") || "Multi-region"}</p>
                  </div>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[12px] text-indigo-300">{formatNumber(a.incident_count)}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-600" />
                  </span>
                </Link>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
