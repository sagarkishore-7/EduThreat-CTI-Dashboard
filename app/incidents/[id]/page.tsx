"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getIncident } from "@/lib/api";
import {
  formatDate,
  formatNumber,
  formatCurrency,
  formatAttackCategory,
  getAttackTypeColor,
  getStatusColor,
  getCountryFlag,
  cn,
} from "@/lib/utils";
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  MapPin,
  Shield,
  Users,
  Database,
  DollarSign,
  Clock,
  AlertTriangle,
  FileText,
  Target,
  Skull,
  Lock,
  Eye,
  Scale,
  Building2,
  Globe,
  Hash,
  Activity,
  Zap,
  Server,
  BookOpen,
  GraduationCap,
  Bookmark,
  Copy,
  CheckCircle2,
  Info,
  Link2,
  Layers,
} from "lucide-react";
import { useState } from "react";

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: incident, isLoading, error } = useQuery({
    queryKey: ["incident", id],
    queryFn: () => getIncident(id),
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading) {
    return <IncidentSkeleton />;
  }

  if (error || !incident) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Incident Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The requested incident could not be found.
          </p>
          <Link href="/incidents" className="text-primary hover:underline">
            ← Back to Incidents
          </Link>
        </div>
      </div>
    );
  }

  // Determine the best institution name
  const institutionName = incident.university_name && incident.university_name !== "Unknown" 
    ? incident.university_name 
    : incident.victim_raw_name || "Unknown Institution";

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Back Button */}
      <Link
        href="/incidents"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Incidents
      </Link>

      {/* Header Card */}
      <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-border rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              {/* Institution Name with Copy */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{getCountryFlag(incident.country)}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl lg:text-3xl font-bold">{institutionName}</h1>
                    <button
                      onClick={() => copyToClipboard(institutionName, "name")}
                      className="p-1 hover:bg-secondary rounded transition-colors"
                      title="Copy institution name"
                    >
                      {copiedField === "name" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  {incident.institution_type && (
                    <span className="text-sm text-muted-foreground capitalize">
                      {incident.institution_type.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Title */}
              {incident.title && (
                <p className="text-lg text-muted-foreground mb-4 max-w-3xl">{incident.title}</p>
              )}
              
              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                <span className={cn("tag", getStatusColor(incident.status))}>
                  {incident.status}
                </span>
                {(incident.attack_category || incident.attack_type_hint) && (
                  <span
                    className={cn(
                      "tag",
                      getAttackTypeColor(incident.attack_category || incident.attack_type_hint)
                    )}
                  >
                    {formatAttackCategory(incident.attack_category || incident.attack_type_hint)}
                  </span>
                )}
                {incident.attack_dynamics?.ransomware_family && (
                  <span className="tag bg-red-500/20 text-red-400 border-red-500/30">
                    <Lock className="w-3 h-3 mr-1" />
                    {incident.attack_dynamics.ransomware_family}
                  </span>
                )}
                {incident.threat_actor_name && (
                  <span className="tag bg-purple-500/20 text-purple-400 border-purple-500/30">
                    <Skull className="w-3 h-3 mr-1" />
                    {incident.threat_actor_name}
                  </span>
                )}
                {incident.llm_enriched && (
                  <span className="tag bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    LLM Enriched
                  </span>
                )}
              </div>
            </div>
            
            {/* Right Column - Metadata */}
            <div className="flex flex-col items-start lg:items-end gap-3 min-w-[200px]">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">{formatDate(incident.incident_date)}</span>
                {incident.date_precision && (
                  <span className="text-xs text-muted-foreground/60">({incident.date_precision})</span>
                )}
              </div>
              
              {/* Incident ID */}
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <code className="text-xs font-mono bg-secondary px-2 py-1 rounded">{incident.incident_id}</code>
                <button
                  onClick={() => copyToClipboard(incident.incident_id, "id")}
                  className="p-1 hover:bg-secondary rounded transition-colors"
                  title="Copy incident ID"
                >
                  {copiedField === "id" ? (
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>
              </div>
              
              {incident.primary_url && (
                <a
                  href={incident.primary_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Original Source
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <QuickStat 
          icon={MapPin} 
          label="Location" 
          value={incident.country || "Unknown"}
          subValue={[incident.city, incident.region].filter(Boolean).join(", ")}
        />
        <QuickStat 
          icon={Building2} 
          label="Institution Type" 
          value={incident.institution_type?.replace(/_/g, " ") || "Unknown"}
        />
        <QuickStat 
          icon={Shield} 
          label="Attack Vector" 
          value={formatAttackCategory(incident.attack_dynamics?.attack_vector) || "Unknown"}
        />
        <QuickStat 
          icon={Database} 
          label="Records Affected" 
          value={incident.data_impact?.records_affected_exact 
            ? formatNumber(incident.data_impact.records_affected_exact)
            : "N/A"}
        />
        <QuickStat 
          icon={Users} 
          label="Individuals Affected" 
          value={incident.user_impact?.total_individuals_affected
            ? formatNumber(incident.user_impact.total_individuals_affected)
            : "N/A"}
        />
        <QuickStat 
          icon={DollarSign} 
          label="Financial Impact" 
          value={incident.financial_impact?.estimated_total_cost_usd
            ? formatCurrency(incident.financial_impact.estimated_total_cost_usd)
            : "N/A"}
        />
      </div>

      {/* Summary Section */}
      {incident.enriched_summary && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Executive Summary
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded ml-2">AI Generated</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-[15px]">
            {incident.enriched_summary}
          </p>
        </div>
      )}

      {/* Original Description/Subtitle */}
      {incident.subtitle && incident.subtitle !== incident.enriched_summary && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Source Description
          </h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {incident.subtitle}
          </p>
        </div>
      )}

      {/* Two Column Layout for Research Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        {incident.timeline && incident.timeline.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Attack Timeline
              <span className="text-xs text-muted-foreground ml-auto">{incident.timeline.length} events</span>
            </h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {incident.timeline.map((event, index) => (
                <div key={index} className="relative pl-6">
                  {index < incident.timeline!.length - 1 && (
                    <div className="absolute left-[5px] top-4 bottom-0 w-0.5 bg-border" />
                  )}
                  <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-primary ring-2 ring-primary/20" />
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {event.date && (
                        <span className="text-sm font-medium text-primary">
                          {formatDate(event.date)}
                        </span>
                      )}
                      {event.event_type && (
                        <span className="tag bg-secondary text-muted-foreground border-border text-xs">
                          {formatAttackCategory(event.event_type)}
                        </span>
                      )}
                      {event.actor_attribution && (
                        <span className="tag bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">
                          {event.actor_attribution}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {event.event_description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MITRE ATT&CK */}
        {incident.mitre_attack_techniques && incident.mitre_attack_techniques.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              MITRE ATT&CK Mapping
              <a 
                href="https://attack.mitre.org/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary ml-auto flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                View Framework
              </a>
            </h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {incident.mitre_attack_techniques.map((tech, index) => (
                <a
                  key={index}
                  href={`https://attack.mitre.org/techniques/${tech.technique_id?.replace(".", "/")}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-secondary/50 rounded-lg border border-border hover:border-primary/30 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm text-primary group-hover:underline">
                      {tech.technique_id}
                    </span>
                    <span className="font-medium">{tech.technique_name}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {tech.tactic && (
                    <span className="tag bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">
                      {tech.tactic}
                    </span>
                  )}
                  {tech.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {tech.description}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Attack Dynamics */}
        {incident.attack_dynamics && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Attack Dynamics
            </h2>
            <div className="space-y-4">
              {/* Attack Chain */}
              {incident.attack_dynamics.attack_chain && incident.attack_dynamics.attack_chain.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Kill Chain Stages</h4>
                  <div className="flex flex-wrap gap-2">
                    {incident.attack_dynamics.attack_chain.map((stage, idx) => (
                      <span key={idx} className="tag bg-orange-500/10 text-orange-400 border-orange-500/20">
                        <span className="text-xs mr-1">{idx + 1}.</span>
                        {formatAttackCategory(stage)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <DataField label="Attack Vector" value={formatAttackCategory(incident.attack_dynamics.attack_vector)} />
                <DataField label="Ransomware Family" value={incident.attack_dynamics.ransomware_family} highlight />
                <DataField label="Data Exfiltration" value={incident.attack_dynamics.data_exfiltration ? "Confirmed" : "Unknown"} />
                <DataField label="Encryption Impact" value={incident.attack_dynamics.encryption_impact} />
                <DataField label="Ransom Demanded" value={incident.attack_dynamics.ransom_demanded ? "Yes" : "No"} />
                <DataField label="Ransom Amount" value={formatCurrency(incident.attack_dynamics.ransom_amount)} />
                <DataField label="Ransom Paid" value={incident.attack_dynamics.ransom_paid === true ? "Yes" : incident.attack_dynamics.ransom_paid === false ? "No" : "Unknown"} />
                <DataField label="Business Impact" value={incident.attack_dynamics.business_impact} />
                <DataField label="Operational Impact" value={incident.attack_dynamics.operational_impact?.join(", ")} />
                <DataField label="Recovery Time" value={incident.attack_dynamics.recovery_timeframe_days ? `${incident.attack_dynamics.recovery_timeframe_days} days` : null} />
              </div>
            </div>
          </div>
        )}

        {/* Initial Access */}
        {incident.initial_access_description && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Initial Access Method
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {incident.initial_access_description}
            </p>
          </div>
        )}
      </div>

      {/* Impact Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-primary" />
          Impact Assessment
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Data Impact */}
          {incident.data_impact && (
            <ImpactCard
              icon={Database}
              title="Data Impact"
              color="cyan"
              items={[
                { label: "Data Breached", value: incident.data_impact.data_breached ? "Yes" : "No", highlight: incident.data_impact.data_breached },
                { label: "Data Exfiltrated", value: incident.data_impact.data_exfiltrated ? "Yes" : "No", highlight: incident.data_impact.data_exfiltrated },
                { label: "Records Affected", value: formatNumber(incident.data_impact.records_affected_exact) },
                { label: "Est. Range", value: incident.data_impact.records_affected_min ? `${formatNumber(incident.data_impact.records_affected_min)} - ${formatNumber(incident.data_impact.records_affected_max)}` : null },
                { label: "PII Records Leaked", value: formatNumber(incident.data_impact.pii_records_leaked) },
              ]}
            />
          )}

          {/* User Impact */}
          {incident.user_impact && (
            <ImpactCard
              icon={Users}
              title="User Impact"
              color="purple"
              items={[
                { label: "Students Affected", value: formatNumber(incident.user_impact.students_affected) },
                { label: "Staff Affected", value: formatNumber(incident.user_impact.staff_affected) },
                { label: "Faculty Affected", value: formatNumber(incident.user_impact.faculty_affected) },
                { label: "Alumni Affected", value: formatNumber(incident.user_impact.alumni_affected) },
                { label: "Total Individuals", value: formatNumber(incident.user_impact.total_individuals_affected), highlight: true },
              ]}
            />
          )}

          {/* System Impact */}
          {incident.system_impact && (
            <ImpactCard
              icon={Server}
              title="System Impact"
              color="orange"
              items={[
                { label: "Network Compromised", value: incident.system_impact.network_compromised ? "Yes" : "No" },
                { label: "Email System", value: incident.system_impact.email_system_affected ? "Affected" : "OK" },
                { label: "Student Portal", value: incident.system_impact.student_portal_affected ? "Affected" : "OK" },
                { label: "Research Systems", value: incident.system_impact.research_systems_affected ? "Affected" : "OK" },
                { label: "Critical Systems", value: incident.system_impact.critical_systems_affected ? "Yes" : "No" },
              ]}
            />
          )}

          {/* Financial Impact */}
          {incident.financial_impact && (
            <ImpactCard
              icon={DollarSign}
              title="Financial Impact"
              color="green"
              items={[
                { label: "Total Est. Cost", value: formatCurrency(incident.financial_impact.estimated_total_cost_usd), highlight: true },
                { label: "Ransom Cost", value: formatCurrency(incident.financial_impact.ransom_cost_usd) },
                { label: "Recovery Cost", value: formatCurrency(incident.financial_impact.recovery_cost_usd) },
                { label: "Legal Cost", value: formatCurrency(incident.financial_impact.legal_cost_usd) },
                { label: "Insurance Claim", value: incident.financial_impact.insurance_claim ? "Filed" : "None" },
                { label: "Insurance Payout", value: formatCurrency(incident.financial_impact.insurance_payout_usd) },
              ]}
            />
          )}

          {/* Regulatory Impact */}
          {incident.regulatory_impact && (
            <ImpactCard
              icon={Scale}
              title="Regulatory Impact"
              color="red"
              items={[
                { label: "Notification Required", value: incident.regulatory_impact.breach_notification_required ? "Yes" : "No" },
                { label: "Notification Sent", value: incident.regulatory_impact.notification_sent ? "Yes" : "No" },
                { label: "Fine Imposed", value: incident.regulatory_impact.fine_imposed ? "Yes" : "No", highlight: incident.regulatory_impact.fine_imposed },
                { label: "Fine Amount", value: formatCurrency(incident.regulatory_impact.fine_amount_usd) },
                { label: "Lawsuits Filed", value: incident.regulatory_impact.lawsuits_filed ? "Yes" : "No" },
                { label: "Class Action", value: incident.regulatory_impact.class_action_filed ? "Filed" : "None" },
              ]}
            />
          )}

          {/* Transparency */}
          {incident.transparency_metrics && (
            <ImpactCard
              icon={Eye}
              title="Transparency"
              color="blue"
              items={[
                { label: "Public Disclosure", value: incident.transparency_metrics.public_disclosure ? "Yes" : "No" },
                { label: "Disclosure Date", value: formatDate(incident.transparency_metrics.public_disclosure_date) },
                { label: "Disclosure Delay", value: incident.transparency_metrics.disclosure_delay_days ? `${incident.transparency_metrics.disclosure_delay_days} days` : null },
                { label: "Transparency Level", value: incident.transparency_metrics.transparency_level },
              ]}
            />
          )}
        </div>
      </div>

      {/* Recovery & Response */}
      {incident.recovery_metrics && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Recovery & Response
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DataField label="Recovery Method" value={incident.recovery_metrics.recovery_method} />
                <DataField label="Recovery Duration" value={incident.recovery_metrics.recovery_duration_days ? `${incident.recovery_metrics.recovery_duration_days} days` : null} />
                <DataField label="Law Enforcement" value={incident.recovery_metrics.law_enforcement_involved === true ? "Involved" : incident.recovery_metrics.law_enforcement_involved === false ? "Not Involved" : null} />
                <DataField label="IR Firm" value={incident.recovery_metrics.ir_firm_engaged} />
              </div>
              {incident.recovery_metrics.security_improvements && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Security Improvements</h4>
                  <p className="text-sm text-foreground">{incident.recovery_metrics.security_improvements}</p>
                </div>
              )}
        </div>
      )}

      {/* Threat Actor Section */}
      {incident.threat_actor_name && (
        <div className="bg-gradient-to-br from-purple-500/10 via-card to-card border border-purple-500/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Skull className="w-5 h-5 text-purple-400" />
            Threat Actor Intelligence
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-purple-500/10 rounded-lg p-4">
              <span className="text-xs text-muted-foreground block mb-1">Actor Name</span>
              <span className="text-lg font-bold text-purple-400">{incident.threat_actor_name}</span>
            </div>
            <DataField label="Category" value={incident.threat_actor_category} />
            <DataField label="Motivation" value={incident.threat_actor_motivation} />
            <DataField label="Source Confidence" value={incident.source_confidence} />
          </div>
        </div>
      )}

      {/* Source URLs & Attribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source URLs */}
        {incident.all_urls && incident.all_urls.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Source References
              <span className="text-xs text-muted-foreground ml-auto">{incident.all_urls.length} sources</span>
            </h2>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {incident.all_urls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors group"
                >
                  <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-mono text-primary truncate group-hover:underline">{url}</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Data Sources & Metadata */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Data Provenance
          </h2>
          <div className="space-y-4">
            {/* Sources */}
            {incident.sources && incident.sources.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Collection Sources</h4>
                <div className="flex flex-wrap gap-2">
                  {incident.sources.map((source, index) => (
                    <span
                      key={index}
                      className="tag bg-secondary text-foreground border-border"
                    >
                      {source.source}
                      <span className="text-muted-foreground ml-2 text-xs">
                        {formatDate(source.first_seen_at)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <DataField label="First Ingested" value={formatDate(incident.ingested_at)} />
              <DataField label="LLM Enriched At" value={formatDate(incident.llm_enriched_at)} />
              <DataField label="Source Published" value={formatDate(incident.source_published_date)} />
              <DataField label="Discovery Date" value={formatDate(incident.discovery_date)} />
            </div>
            
            {/* Notes */}
            {incident.notes && (
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Notes</h4>
                <p className="text-xs text-muted-foreground font-mono bg-secondary/50 p-2 rounded">
                  {incident.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Research Citation Box */}
      <div className="bg-secondary/30 border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-primary" />
          For Researchers
        </h2>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Citation Format</h4>
            <div className="bg-card rounded-lg p-3 font-mono text-sm text-muted-foreground">
              EduThreat-CTI. &quot;{institutionName} Cyber Incident ({formatDate(incident.incident_date)}).&quot; 
              Incident ID: {incident.incident_id}. Retrieved {new Date().toLocaleDateString()}.
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => copyToClipboard(
                `EduThreat-CTI. "${institutionName} Cyber Incident (${formatDate(incident.incident_date)})." Incident ID: ${incident.incident_id}. Retrieved ${new Date().toLocaleDateString()}.`,
                "citation"
              )}
              className="btn btn-secondary text-sm"
            >
              {copiedField === "citation" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Citation
                </>
              )}
            </button>
            <button
              onClick={() => copyToClipboard(
                JSON.stringify(incident, null, 2),
                "json"
              )}
              className="btn btn-secondary text-sm"
            >
              {copiedField === "json" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy JSON
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickStat({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="font-medium text-sm capitalize truncate">{value}</p>
      {subValue && <p className="text-xs text-muted-foreground truncate">{subValue}</p>}
    </div>
  );
}

function DataField({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | null | undefined;
  highlight?: boolean;
}) {
  const displayValue = value || "N/A";
  const isNA = !value || value === "N/A" || value === "Unknown";
  
  return (
    <div>
      <span className="text-xs text-muted-foreground block mb-0.5">{label}</span>
      <span className={cn(
        "text-sm font-medium capitalize",
        isNA && "text-muted-foreground/50",
        highlight && !isNA && "text-primary"
      )}>
        {displayValue}
      </span>
    </div>
  );
}

function ImpactCard({
  icon: Icon,
  title,
  color,
  items,
}: {
  icon: React.ElementType;
  title: string;
  color: "cyan" | "purple" | "orange" | "green" | "red" | "blue";
  items: { label: string; value: string | null | undefined; highlight?: boolean }[];
}) {
  const colorMap = {
    cyan: "text-cyan-400",
    purple: "text-purple-400",
    orange: "text-orange-400",
    green: "text-green-400",
    red: "text-red-400",
    blue: "text-blue-400",
  };
  
  return (
    <div className="bg-secondary/30 rounded-lg p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
        <Icon className={cn("w-4 h-4", colorMap[color])} />
        {title}
      </h3>
      <div className="space-y-2">
        {items.filter(item => item.value && item.value !== "N/A").map((item, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className={cn(
              "font-medium",
              item.highlight && colorMap[color]
            )}>
              {item.value}
            </span>
          </div>
        ))}
        {items.every(item => !item.value || item.value === "N/A") && (
          <p className="text-xs text-muted-foreground/50 italic">No data available</p>
        )}
      </div>
    </div>
  );
}

function IncidentSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="h-6 w-32 skeleton rounded" />
      <div className="bg-card border border-border rounded-xl p-6 h-48 skeleton" />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 skeleton rounded-lg" />
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-6 h-40 skeleton" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-60 skeleton rounded-xl" />
        ))}
      </div>
    </div>
  );
}
