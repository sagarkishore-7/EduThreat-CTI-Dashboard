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
} from "lucide-react";

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: incident, isLoading, error } = useQuery({
    queryKey: ["incident", id],
    queryFn: () => getIncident(id),
  });

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

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Back Button */}
      <Link
        href="/incidents"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Incidents
      </Link>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{getCountryFlag(incident.country)}</span>
              <h1 className="text-2xl font-bold">{incident.university_name}</h1>
            </div>
            {incident.title && (
              <p className="text-lg text-muted-foreground mb-4">{incident.title}</p>
            )}
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
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(incident.incident_date)}</span>
            </div>
            {incident.primary_url && (
              <a
                href={incident.primary_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:text-primary/80"
              >
                <ExternalLink className="w-4 h-4" />
                View Source
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      {incident.enriched_summary && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Incident Summary
          </h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {incident.enriched_summary}
          </p>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Location */}
        <MetricCard
          icon={MapPin}
          label="Location"
          value={[incident.city, incident.region, incident.country].filter(Boolean).join(", ") || "Unknown"}
        />
        {/* Institution Type */}
        <MetricCard
          icon={Target}
          label="Institution Type"
          value={incident.institution_type || "Unknown"}
        />
        {/* Attack Vector */}
        <MetricCard
          icon={Shield}
          label="Attack Vector"
          value={formatAttackCategory(incident.attack_dynamics?.attack_vector) || "Unknown"}
        />
        {/* Business Impact */}
        <MetricCard
          icon={AlertTriangle}
          label="Business Impact"
          value={incident.attack_dynamics?.business_impact || "Unknown"}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        {incident.timeline && incident.timeline.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Timeline
            </h2>
            <div className="space-y-4">
              {incident.timeline.map((event, index) => (
                <div key={index} className="relative pl-6">
                  {index < incident.timeline!.length - 1 && (
                    <div className="timeline-connector" />
                  )}
                  <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-primary" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
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
              MITRE ATT&CK Techniques
            </h2>
            <div className="space-y-3">
              {incident.mitre_attack_techniques.map((tech, index) => (
                <div
                  key={index}
                  className="p-3 bg-secondary/50 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm text-primary">
                      {tech.technique_id}
                    </span>
                    <span className="font-medium">{tech.technique_name}</span>
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
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Impact Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Data Impact */}
        {incident.data_impact && (
          <ImpactCard
            icon={Database}
            title="Data Impact"
            items={[
              { label: "Data Breached", value: incident.data_impact.data_breached ? "Yes" : "No" },
              { label: "Data Exfiltrated", value: incident.data_impact.data_exfiltrated ? "Yes" : "No" },
              { label: "Records Affected", value: formatNumber(incident.data_impact.records_affected_exact) },
              { label: "PII Leaked", value: formatNumber(incident.data_impact.pii_records_leaked) },
            ]}
          />
        )}

        {/* User Impact */}
        {incident.user_impact && (
          <ImpactCard
            icon={Users}
            title="User Impact"
            items={[
              { label: "Students Affected", value: formatNumber(incident.user_impact.students_affected) },
              { label: "Staff Affected", value: formatNumber(incident.user_impact.staff_affected) },
              { label: "Faculty Affected", value: formatNumber(incident.user_impact.faculty_affected) },
              { label: "Total Affected", value: formatNumber(incident.user_impact.total_individuals_affected) },
            ]}
          />
        )}

        {/* Financial Impact */}
        {incident.financial_impact && (
          <ImpactCard
            icon={DollarSign}
            title="Financial Impact"
            items={[
              { label: "Ransom Amount", value: formatCurrency(incident.financial_impact.ransom_cost_usd) },
              { label: "Recovery Cost", value: formatCurrency(incident.financial_impact.recovery_cost_usd) },
              { label: "Legal Cost", value: formatCurrency(incident.financial_impact.legal_cost_usd) },
              { label: "Insurance Claim", value: incident.financial_impact.insurance_claim ? "Yes" : "No" },
            ]}
          />
        )}

        {/* Regulatory Impact */}
        {incident.regulatory_impact && (
          <ImpactCard
            icon={Scale}
            title="Regulatory Impact"
            items={[
              { label: "Notification Required", value: incident.regulatory_impact.breach_notification_required ? "Yes" : "No" },
              { label: "Notification Sent", value: incident.regulatory_impact.notification_sent ? "Yes" : "No" },
              { label: "Fine Imposed", value: incident.regulatory_impact.fine_imposed ? "Yes" : "No" },
              { label: "Fine Amount", value: formatCurrency(incident.regulatory_impact.fine_amount_usd) },
              { label: "Lawsuits Filed", value: incident.regulatory_impact.lawsuits_filed ? "Yes" : "No" },
            ]}
          />
        )}

        {/* Transparency */}
        {incident.transparency_metrics && (
          <ImpactCard
            icon={Eye}
            title="Transparency"
            items={[
              { label: "Public Disclosure", value: incident.transparency_metrics.public_disclosure ? "Yes" : "No" },
              { label: "Disclosure Date", value: formatDate(incident.transparency_metrics.public_disclosure_date) },
              { label: "Disclosure Delay", value: incident.transparency_metrics.disclosure_delay_days ? `${incident.transparency_metrics.disclosure_delay_days} days` : "N/A" },
              { label: "Transparency Level", value: incident.transparency_metrics.transparency_level || "Unknown" },
            ]}
          />
        )}

        {/* Recovery */}
        {incident.recovery_metrics && (
          <ImpactCard
            icon={Clock}
            title="Recovery"
            items={[
              { label: "Recovery Duration", value: incident.recovery_metrics.recovery_duration_days ? `${incident.recovery_metrics.recovery_duration_days} days` : "N/A" },
              { label: "IR Firm", value: incident.recovery_metrics.ir_firm_engaged || "N/A" },
            ]}
          />
        )}
      </div>

      {/* Source URLs */}
      {incident.all_urls && incident.all_urls.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-primary" />
            Source URLs
          </h2>
          <div className="space-y-2">
            {incident.all_urls.map((url, index) => (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors text-sm font-mono text-primary truncate"
              >
                {url}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {incident.sources && incident.sources.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Data Sources</h2>
          <div className="flex flex-wrap gap-2">
            {incident.sources.map((source, index) => (
              <span
                key={index}
                className="tag bg-secondary text-foreground border-border"
              >
                {source.source}
                <span className="text-muted-foreground ml-2">
                  ({formatDate(source.first_seen_at)})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}

function ImpactCard({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ElementType;
  title: string;
  items: { label: string; value: string }[];
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Icon className="w-5 h-5 text-primary" />
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IncidentSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="h-6 w-32 skeleton rounded" />
      <div className="bg-card border border-border rounded-xl p-6 h-40 skeleton" />
      <div className="bg-card border border-border rounded-xl p-6 h-32 skeleton" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 skeleton rounded-xl" />
        ))}
      </div>
    </div>
  );
}

