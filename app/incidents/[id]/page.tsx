"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getIncident, API_BASE } from "@/lib/api";
import {
  formatDate, formatNumber, formatCurrency, formatAttackCategory,
  getAttackTypeColor, getCountryFlag, cn,
} from "@/lib/utils";
import {
  ArrowLeft, ExternalLink, Calendar, MapPin, Shield, Users, Database,
  DollarSign, Clock, AlertTriangle, FileText, Target, Skull, Lock,
  Eye, Scale, Building2, Globe, Hash, Activity, Zap, Server,
  BookOpen, Bookmark, Copy, CheckCircle2, Link2, Layers, Download,
  ChevronRight, Fingerprint, Terminal,
} from "lucide-react";
import { useState, useEffect } from "react";

type Tab = "overview" | "timeline" | "mitre" | "impact" | "intelligence" | "sources";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview",      label: "Overview",      icon: FileText },
  { id: "timeline",      label: "Timeline",       icon: Clock },
  { id: "mitre",         label: "MITRE ATT&CK",  icon: Target },
  { id: "impact",        label: "Impact",         icon: AlertTriangle },
  { id: "intelligence",  label: "Intelligence",   icon: Fingerprint },
  { id: "sources",       label: "Sources",        icon: Link2 },
];

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const [tab, setTab] = useState<Tab>("overview");
  const [copied, setCopied] = useState<string | null>(null);

  // Mark this incident as visited so the list can highlight it
  useEffect(() => {
    if (!id) return;
    try {
      const raw = localStorage.getItem("visitedIncidents");
      const visited: string[] = raw ? JSON.parse(raw) : [];
      if (!visited.includes(id)) {
        const updated = [id, ...visited].slice(0, 500); // cap at 500
        localStorage.setItem("visitedIncidents", JSON.stringify(updated));
      }
    } catch { /* ignore storage errors */ }
  }, [id]);

  const { data: incident, isLoading, error } = useQuery({
    queryKey: ["incident", id],
    queryFn: () => getIncident(id),
  });

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyBtn = ({ value, k, size = "sm" }: { value: string; k: string; size?: "sm" | "xs" }) => (
    <button onClick={() => copy(value, k)}
      className={cn("transition-colors rounded shrink-0", size === "xs" ? "p-0.5" : "p-1",
        "text-zinc-600 hover:text-zinc-300")}>
      {copied === k
        ? <CheckCircle2 className={size === "xs" ? "w-3 h-3 text-emerald-400" : "w-3.5 h-3.5 text-emerald-400"} />
        : <Copy className={size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5"} />}
    </button>
  );

  // Restore the list URL the user came from (passed as ?from=...)
  const fromParam = searchParams.get("from");
  const listHref = fromParam ? `/incidents?${fromParam}` : "/incidents";

  if (isLoading) return <DetailSkeleton />;

  if (error || !incident) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-base font-semibold text-zinc-200">Incident not found</h2>
          <Link href="/incidents" className="text-sm text-cyan-400 hover:text-cyan-300">← Back to incidents</Link>
        </div>
      </div>
    );
  }

  const name = (incident.institution_name && incident.institution_name !== "Unknown")
    ? incident.institution_name
    : "Unknown Institution";

  const attackType = incident.attack_category || incident.attack_type_hint;
  const hasTimeline  = (incident.timeline?.length ?? 0) > 0;
  const hasMitre     = (incident.mitre_attack_techniques?.length ?? 0) > 0;
  const hasImpact    = !!(incident.data_impact || incident.user_impact || incident.system_impact || incident.financial_impact || incident.regulatory_impact || incident.transparency_metrics);
  const hasIntel     = !!(incident.threat_actor_name || incident.attack_dynamics);
  const hasSources   = (incident.all_urls?.length ?? 0) > 0 || (incident.sources?.length ?? 0) > 0 || !!incident.primary_url;

  const tabEnabled: Record<Tab, boolean> = {
    overview: true,
    timeline: hasTimeline,
    mitre: hasMitre,
    impact: hasImpact,
    intelligence: hasIntel,
    sources: hasSources,
  };

  return (
    <div className="max-w-7xl mx-auto pb-16 space-y-4 animate-fade-in">

      {/* ── Breadcrumb nav ───────────────────────────────────── */}
      <div className="flex items-center gap-1.5 text-[12px]">
        <Link href={listHref} className="text-zinc-500 hover:text-cyan-400 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Incidents
        </Link>
        <ChevronRight className="w-3 h-3 text-zinc-700" />
        <span className="text-zinc-400 truncate max-w-xs">{name}</span>
      </div>

      {/* ── Header card ──────────────────────────────────────── */}
      <div className="bg-[#0d0d1a] border border-zinc-800 rounded-lg p-5 relative overflow-hidden">
        {/* Ambient accent */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(34,211,238,0.04) 0%, transparent 70%)" }} />

        <div className="relative flex flex-col lg:flex-row gap-5">
          {/* Left: identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-4xl leading-none shrink-0">{getCountryFlag(incident.country)}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl lg:text-2xl font-bold text-zinc-100 truncate">{name}</h1>
                  <CopyBtn value={name} k="name" />
                </div>
                {incident.institution_type && (
                  <p className="text-[12px] text-zinc-500 capitalize">{incident.institution_type.replace(/_/g, " ")}</p>
                )}
              </div>
            </div>

            {incident.title && (
              <p className="text-[14px] text-zinc-400 mb-3 leading-relaxed">{incident.title}</p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {attackType && (
                <span className={cn("tag", getAttackTypeColor(attackType))}>
                  {formatAttackCategory(attackType)}
                </span>
              )}
              {incident.attack_dynamics?.ransomware_family && (
                <span className="tag bg-red-500/10 text-red-400 border-red-500/20">
                  <Lock className="w-2.5 h-2.5 mr-1" />{incident.attack_dynamics.ransomware_family}
                </span>
              )}
              {incident.threat_actor_name && (
                <span className="tag bg-violet-500/10 text-violet-400 border-violet-500/20">
                  <Skull className="w-2.5 h-2.5 mr-1" />{incident.threat_actor_name}
                </span>
              )}
              {incident.llm_enriched && (
                <span className="tag bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  <CheckCircle2 className="w-2.5 h-2.5 mr-1" />enriched
                </span>
              )}
              {incident.data_impact?.data_breached && (
                <span className="tag bg-amber-500/10 text-amber-400 border-amber-500/20">
                  <Database className="w-2.5 h-2.5 mr-1" />data breach
                </span>
              )}
            </div>
          </div>

          {/* Right: meta + actions */}
          <div className="flex flex-col gap-3 shrink-0 lg:items-end">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[13px]">
              <Calendar className="w-3.5 h-3.5 text-zinc-600" />
              <span className="font-mono">{formatDate(incident.incident_date)}</span>
              {incident.date_precision && (
                <span className="text-zinc-600 text-[10px]">({incident.date_precision})</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-zinc-600" />
              <code className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-500">
                {incident.incident_id}
              </code>
              <CopyBtn value={incident.incident_id} k="id" size="xs" />
            </div>
            <div className="flex gap-2">
              {incident.primary_url && (
                <a href={incident.primary_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />Source
                </a>
              )}
              <a href={`${API_BASE}/api/incidents/${incident.incident_id}/report`} download
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-colors">
                <Download className="w-3.5 h-3.5" />CTI Report
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick stats strip ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <QuickStat icon={MapPin} label="Location" value={incident.country || "Unknown"} sub={[incident.city, incident.region].filter(Boolean).join(", ")} />
        <QuickStat icon={Building2} label="Institution" value={incident.institution_type?.replace(/_/g, " ") || "Unknown"} />
        <QuickStat icon={Shield} label="Attack Vector" value={formatAttackCategory(incident.attack_dynamics?.attack_vector) || "Unknown"} />
        <QuickStat icon={Database} label="Records" value={incident.data_impact?.records_affected_exact ? formatNumber(incident.data_impact.records_affected_exact) : "N/A"} />
        <QuickStat icon={Users} label="Individuals" value={incident.user_impact?.total_individuals_affected ? formatNumber(incident.user_impact.total_individuals_affected) : "N/A"} />
        <QuickStat icon={DollarSign} label="Est. Cost" value={incident.financial_impact?.estimated_total_cost_usd ? formatCurrency(incident.financial_impact.estimated_total_cost_usd) : "N/A"} />
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="border-b border-zinc-800 flex gap-0 overflow-x-auto">
        {TABS.map(({ id: tid, label, icon: Icon }) => {
          const enabled = tabEnabled[tid];
          return (
            <button
              key={tid}
              onClick={() => enabled && setTab(tid)}
              disabled={!enabled}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium whitespace-nowrap border-b-2 transition-all",
                tab === tid
                  ? "border-cyan-400 text-cyan-300"
                  : enabled
                  ? "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                  : "border-transparent text-zinc-700 cursor-not-allowed"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {!enabled && <span className="text-[9px] text-zinc-700">—</span>}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ──────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-4">
          {incident.enriched_summary && (
            <Section icon={FileText} label="Executive Summary" badge="AI Generated">
              <p className="text-[14px] text-zinc-400 leading-relaxed whitespace-pre-wrap">{incident.enriched_summary}</p>
            </Section>
          )}
          {incident.subtitle && incident.subtitle !== incident.enriched_summary && (
            <Section icon={BookOpen} label="Source Description">
              <p className="text-[14px] text-zinc-400 leading-relaxed">{incident.subtitle}</p>
            </Section>
          )}
          {incident.initial_access_description && (
            <Section icon={Activity} label="Initial Access Method">
              <p className="text-[14px] text-zinc-400 leading-relaxed">{incident.initial_access_description}</p>
            </Section>
          )}
          {!incident.enriched_summary && !incident.subtitle && !incident.initial_access_description && (
            <EmptyTab message="This incident has not been LLM-enriched yet." />
          )}
        </div>
      )}

      {tab === "timeline" && (
        <Section icon={Clock} label="Attack Timeline" count={incident.timeline?.length}>
          <div className="space-y-3">
            {incident.timeline?.map((event, i) => (
              <div key={i} className="relative pl-7">
                {i < (incident.timeline!.length - 1) && (
                  <div className="absolute left-[10px] top-5 bottom-0 w-px bg-zinc-800" />
                )}
                <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {event.date && (
                      <span className="text-[12px] font-mono text-cyan-400 font-semibold">{formatDate(event.date)}</span>
                    )}
                    {event.event_type && (
                      <span className="tag bg-zinc-800 text-zinc-400 border-zinc-700">{formatAttackCategory(event.event_type)}</span>
                    )}
                    {event.actor_attribution && (
                      <span className="tag bg-violet-500/10 text-violet-400 border-violet-500/20">{event.actor_attribution}</span>
                    )}
                  </div>
                  <p className="text-[13px] text-zinc-400">{event.event_description}</p>
                  {event.indicators && event.indicators.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {event.indicators.map((ioc, j) => (
                        <code key={j} className="text-[10px] font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-500">{ioc}</code>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {tab === "mitre" && (
        <Section icon={Target} label="MITRE ATT&CK Mapping" count={incident.mitre_attack_techniques?.length}
          headerRight={
            <a href="https://attack.mitre.org/" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-cyan-400 transition-colors">
              <ExternalLink className="w-3 h-3" />Framework
            </a>
          }>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {incident.mitre_attack_techniques?.map((tech, i) => (
              <a key={i} href={`https://attack.mitre.org/techniques/${tech.technique_id?.replace(".", "/")}/`}
                target="_blank" rel="noopener noreferrer"
                className="block p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg hover:border-cyan-500/30 transition-colors group">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-[11px] font-mono text-cyan-400 group-hover:underline">{tech.technique_id}</code>
                  <span className="text-[13px] font-medium text-zinc-200 truncate">{tech.technique_name}</span>
                  <ExternalLink className="w-3 h-3 text-zinc-700 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {tech.tactic && (
                  <span className="tag bg-violet-500/10 text-violet-400 border-violet-500/20 mb-2">{tech.tactic}</span>
                )}
                {tech.description && (
                  <p className="text-[12px] text-zinc-500 mt-1.5">{tech.description}</p>
                )}
                {tech.sub_techniques && tech.sub_techniques.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tech.sub_techniques.map((st, j) => (
                      <code key={j} className="text-[10px] font-mono text-zinc-600 bg-zinc-900 px-1 py-0.5 rounded">{st}</code>
                    ))}
                  </div>
                )}
              </a>
            ))}
          </div>
        </Section>
      )}

      {tab === "impact" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {incident.data_impact && (
              <ImpactCard icon={Database} title="Data Impact" accent="cyan" fields={[
                { label: "Data Breached",    value: incident.data_impact.data_breached ? "Confirmed" : "None", alert: !!incident.data_impact.data_breached },
                { label: "Exfiltrated",      value: incident.data_impact.data_exfiltrated ? "Yes" : "No" },
                { label: "Records Affected", value: formatNumber(incident.data_impact.records_affected_exact) },
                { label: "PII Records",      value: formatNumber(incident.data_impact.pii_records_leaked) },
                { label: "Categories",       value: incident.data_impact.data_categories?.join(", ") },
              ]} />
            )}
            {incident.user_impact && (
              <ImpactCard icon={Users} title="User Impact" accent="violet" fields={[
                { label: "Students",   value: formatNumber(incident.user_impact.students_affected) },
                { label: "Staff",      value: formatNumber(incident.user_impact.staff_affected) },
                { label: "Faculty",    value: formatNumber(incident.user_impact.faculty_affected) },
                { label: "Alumni",     value: formatNumber(incident.user_impact.alumni_affected) },
                { label: "Total",      value: formatNumber(incident.user_impact.total_individuals_affected), bold: true },
              ]} />
            )}
            {incident.system_impact && (
              <ImpactCard icon={Server} title="System Impact" accent="orange" fields={[
                { label: "Network",         value: incident.system_impact.network_compromised ? "Compromised" : "OK", alert: !!incident.system_impact.network_compromised },
                { label: "Email",           value: incident.system_impact.email_system_affected ? "Affected" : "OK" },
                { label: "Student Portal",  value: incident.system_impact.student_portal_affected ? "Affected" : "OK" },
                { label: "Research Sys",    value: incident.system_impact.research_systems_affected ? "Affected" : "OK" },
                { label: "Critical Sys",    value: incident.system_impact.critical_systems_affected ? "Yes" : "No", alert: !!incident.system_impact.critical_systems_affected },
              ]} />
            )}
            {incident.financial_impact && (
              <ImpactCard icon={DollarSign} title="Financial Impact" accent="emerald" fields={[
                { label: "Total Cost",      value: formatCurrency(incident.financial_impact.estimated_total_cost_usd), bold: true },
                { label: "Ransom",          value: formatCurrency(incident.financial_impact.ransom_cost_usd) },
                { label: "Recovery",        value: formatCurrency(incident.financial_impact.recovery_cost_usd) },
                { label: "Legal",           value: formatCurrency(incident.financial_impact.legal_cost_usd) },
                { label: "Insurance",       value: incident.financial_impact.insurance_claim ? `Claimed${incident.financial_impact.insurance_payout_usd ? ` (${formatCurrency(incident.financial_impact.insurance_payout_usd)})` : ""}` : "None" },
              ]} />
            )}
            {incident.regulatory_impact && (
              <ImpactCard icon={Scale} title="Regulatory" accent="red" fields={[
                { label: "Notification Req",  value: incident.regulatory_impact.breach_notification_required ? "Yes" : "No" },
                { label: "Notified",          value: incident.regulatory_impact.notification_sent ? "Yes" : "No" },
                { label: "Fine",              value: incident.regulatory_impact.fine_imposed ? (formatCurrency(incident.regulatory_impact.fine_amount_usd) || "Yes") : "No", alert: !!incident.regulatory_impact.fine_imposed },
                { label: "Lawsuits",          value: incident.regulatory_impact.lawsuits_filed ? "Filed" : "None" },
                { label: "Class Action",      value: incident.regulatory_impact.class_action_filed ? "Filed" : "None" },
                { label: "Regulations",       value: incident.regulatory_impact.applicable_regulations?.join(", ") },
              ]} />
            )}
            {incident.transparency_metrics && (
              <ImpactCard icon={Eye} title="Transparency" accent="sky" fields={[
                { label: "Public Disclosure", value: incident.transparency_metrics.public_disclosure ? "Yes" : "No" },
                { label: "Disclosed",         value: formatDate(incident.transparency_metrics.public_disclosure_date) },
                { label: "Delay",             value: incident.transparency_metrics.disclosure_delay_days ? `${incident.transparency_metrics.disclosure_delay_days} days` : null },
                { label: "Level",             value: incident.transparency_metrics.transparency_level },
              ]} />
            )}
          </div>
          {incident.recovery_metrics && (
            <Section icon={Activity} label="Recovery & Response">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <DF label="Recovery Method"    value={incident.recovery_metrics.recovery_method} />
                <DF label="Duration"           value={incident.recovery_metrics.recovery_duration_days ? `${incident.recovery_metrics.recovery_duration_days} days` : null} />
                <DF label="Law Enforcement"    value={incident.recovery_metrics.law_enforcement_involved != null ? (incident.recovery_metrics.law_enforcement_involved ? "Involved" : "Not involved") : null} />
                <DF label="IR Firm"            value={incident.recovery_metrics.ir_firm_engaged} />
              </div>
              {incident.recovery_metrics.security_improvements && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Security Improvements</p>
                  <p className="text-[13px] text-zinc-400">{incident.recovery_metrics.security_improvements}</p>
                </div>
              )}
            </Section>
          )}
        </div>
      )}

      {tab === "intelligence" && (
        <div className="space-y-4">
          {incident.threat_actor_name && (
            <div className="bg-[#0d0d1a] border border-violet-500/20 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Skull className="w-4 h-4 text-violet-400" />
                <p className="section-label">Threat Actor Profile</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Actor</p>
                  <p className="text-lg font-bold text-violet-300">{incident.threat_actor_name}</p>
                </div>
                <DF label="Category"    value={incident.threat_actor_category} />
                <DF label="Motivation"  value={incident.threat_actor_motivation} />
                <DF label="Confidence"  value={incident.source_confidence} />
              </div>
            </div>
          )}

          {incident.attack_dynamics && (
            <Section icon={Zap} label="Attack Dynamics">
              {incident.attack_dynamics.attack_chain && incident.attack_dynamics.attack_chain.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Kill Chain</p>
                  <div className="flex flex-wrap items-center gap-1">
                    {incident.attack_dynamics.attack_chain.map((stage, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <ChevronRight className="w-3 h-3 text-zinc-700" />}
                        <span className="tag bg-amber-500/10 text-amber-400 border-amber-500/20">
                          {formatAttackCategory(stage)}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DF label="Attack Vector"      value={formatAttackCategory(incident.attack_dynamics.attack_vector)} />
                <DF label="Ransomware Family"  value={incident.attack_dynamics.ransomware_family} />
                <DF label="Data Exfiltration"  value={incident.attack_dynamics.data_exfiltration != null ? (incident.attack_dynamics.data_exfiltration ? "Confirmed" : "None") : null} />
                <DF label="Encryption Impact"  value={incident.attack_dynamics.encryption_impact} />
                <DF label="Ransom Demanded"    value={incident.attack_dynamics.ransom_demanded != null ? (incident.attack_dynamics.ransom_demanded ? "Yes" : "No") : null} />
                <DF label="Ransom Amount"      value={formatCurrency(incident.attack_dynamics.ransom_amount)} />
                <DF label="Ransom Paid"        value={incident.attack_dynamics.ransom_paid != null ? (incident.attack_dynamics.ransom_paid ? "Yes" : "No") : null} />
                <DF label="Recovery Time"      value={incident.attack_dynamics.recovery_timeframe_days ? `${incident.attack_dynamics.recovery_timeframe_days} days` : null} />
                <DF label="Business Impact"    value={incident.attack_dynamics.business_impact} />
              </div>
              {incident.attack_dynamics.operational_impact && incident.attack_dynamics.operational_impact.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Operational Impact</p>
                  <div className="flex flex-wrap gap-1.5">
                    {incident.attack_dynamics.operational_impact.map((op, i) => (
                      <span key={i} className="tag bg-zinc-800 text-zinc-400 border-zinc-700">{op}</span>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}
        </div>
      )}

      {tab === "sources" && (
        <div className="space-y-4">
          {(() => {
            // Merge primary_url into all_urls, deduplicating
            const urlSet = new Set<string>(incident.all_urls ?? []);
            if (incident.primary_url) urlSet.add(incident.primary_url);
            const allUrls = Array.from(urlSet);
            return allUrls.length > 0 ? (
              <Section icon={Globe} label="Source URLs" count={allUrls.length}>
                <div className="space-y-1.5">
                  {allUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2.5 bg-zinc-900/40 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors group">
                      <Globe className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      <span className="text-[12px] font-mono text-cyan-400 truncate group-hover:underline flex-1">{url}</span>
                      {url === incident.primary_url && (
                        <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">primary</span>
                      )}
                      <ExternalLink className="w-3 h-3 text-zinc-700 shrink-0" />
                    </a>
                  ))}
                </div>
              </Section>
            ) : null;
          })()}

          {incident.sources && incident.sources.length > 0 && (
            <Section icon={Layers} label="Data Provenance">
              <div className="flex flex-wrap gap-1.5 mb-4">
                {incident.sources.map((src, i) => (
                  <span key={i} className="flex items-center gap-1.5 tag bg-zinc-800 text-zinc-300 border-zinc-700">
                    {src.source}
                    <span className="text-zinc-600 text-[9px] font-mono">{formatDate(src.first_seen_at)}</span>
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DF label="First Ingested"   value={formatDate(incident.ingested_at)} />
                <DF label="LLM Enriched At"  value={formatDate(incident.llm_enriched_at)} />
                <DF label="Source Published" value={formatDate(incident.source_published_date)} />
                <DF label="Discovery Date"   value={formatDate(incident.discovery_date)} />
              </div>
            </Section>
          )}

          {/* Research citation */}
          <Section icon={Bookmark} label="Research Citation">
            <div className="space-y-3">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 font-mono text-[12px] text-zinc-500">
                EduThreat-CTI. &quot;{name} Cyber Incident ({formatDate(incident.incident_date)}).&quot;
                Incident ID: {incident.incident_id}. Retrieved {new Date().toLocaleDateString()}.
              </div>
              <div className="flex gap-2">
                <button onClick={() => copy(`EduThreat-CTI. "${name} Cyber Incident (${formatDate(incident.incident_date)})." Incident ID: ${incident.incident_id}. Retrieved ${new Date().toLocaleDateString()}.`, "citation")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors">
                  {copied === "citation" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy Citation
                </button>
                <button onClick={() => copy(JSON.stringify(incident, null, 2), "json")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors">
                  {copied === "json" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy JSON
                </button>
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function QuickStat({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#0d0d1a] border border-zinc-800 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-zinc-600" />
        <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">{label}</span>
      </div>
      <p className="text-[13px] font-semibold text-zinc-200 capitalize truncate">{value}</p>
      {sub && <p className="text-[11px] text-zinc-600 truncate">{sub}</p>}
    </div>
  );
}

function Section({ icon: Icon, label, badge, count, headerRight, children }: {
  icon: React.ElementType; label: string; badge?: string; count?: number;
  headerRight?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0d0d1a] border border-zinc-800 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-cyan-500" />
          <h2 className="text-[13px] font-semibold text-zinc-200">{label}</h2>
          {badge && <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{badge}</span>}
          {count !== undefined && <span className="text-[10px] text-zinc-600 font-mono">{count}</span>}
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

function DF({ label, value }: { label: string; value: string | null | undefined }) {
  const empty = !value || value === "N/A" || value === "Unknown";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-0.5">{label}</p>
      <p className={cn("text-[13px] font-medium capitalize", empty ? "text-zinc-700" : "text-zinc-300")}>
        {value || "—"}
      </p>
    </div>
  );
}

function ImpactCard({ icon: Icon, title, accent, fields }: {
  icon: React.ElementType; title: string; accent: string;
  fields: { label: string; value: string | null | undefined; alert?: boolean; bold?: boolean }[];
}) {
  const accentMap: Record<string, string> = {
    cyan: "text-cyan-400", violet: "text-violet-400", orange: "text-orange-400",
    emerald: "text-emerald-400", red: "text-red-400", sky: "text-sky-400",
  };
  const borderMap: Record<string, string> = {
    cyan: "border-cyan-500/15", violet: "border-violet-500/15", orange: "border-orange-500/15",
    emerald: "border-emerald-500/15", red: "border-red-500/15", sky: "border-sky-500/15",
  };
  const c = accentMap[accent] ?? "text-zinc-400";
  const b = borderMap[accent] ?? "border-zinc-800";

  return (
    <div className={cn("bg-zinc-900/30 border rounded-lg p-4", b)}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("w-4 h-4", c)} />
        <h3 className="text-[12px] font-semibold text-zinc-300">{title}</h3>
      </div>
      <div className="space-y-1.5">
        {fields.filter(f => f.value).map((f, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-600">{f.label}</span>
            <span className={cn("text-[12px] font-mono",
              f.alert ? "text-red-400" : f.bold ? c : "text-zinc-300")}>
              {f.value}
            </span>
          </div>
        ))}
        {fields.every(f => !f.value) && (
          <p className="text-[11px] text-zinc-700 italic">No data</p>
        )}
      </div>
    </div>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-20 text-zinc-700">
      <div className="text-center space-y-2">
        <FileText className="w-8 h-8 mx-auto" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto animate-pulse">
      <div className="h-5 w-32 bg-zinc-900 rounded" />
      <div className="h-40 bg-zinc-900 border border-zinc-800 rounded-lg" />
      <div className="grid grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-zinc-900 border border-zinc-800 rounded-lg" />)}
      </div>
      <div className="h-10 bg-zinc-900 border-b border-zinc-800" />
      <div className="h-64 bg-zinc-900 border border-zinc-800 rounded-lg" />
    </div>
  );
}
