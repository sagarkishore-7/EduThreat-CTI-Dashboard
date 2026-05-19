/**
 * Public API client for the EduThreat-CTI v2 dashboard.
 *
 * This file intentionally exposes a small compatibility layer over the new
 * Postgres-backed `/api/v2` surface instead of carrying forward the old
 * SQLite-era endpoint map.
 */

import { COUNTRY_NAME_TO_CODE } from "@/lib/utils";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface IncidentSummary {
  incident_id: string;
  institution_name: string;
  institution_type?: string;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  incident_date?: string;
  date_precision?: string;
  title?: string;
  subtitle?: string;
  enriched_summary?: string;
  attack_type_hint?: string;
  attack_category?: string;
  ransomware_family?: string;
  threat_actor_name?: string;
  status: string;
  source_confidence: string;
  llm_enriched: boolean;
  llm_enriched_at?: string;
  ingested_at?: string;
  source_count?: number;
  sources: string[];
}

export interface TimelineEvent {
  date?: string;
  date_precision?: string;
  event_description?: string;
  event_type?: string;
  actor_attribution?: string;
  indicators?: string[];
}

export interface MITRETechnique {
  technique_id?: string;
  technique_name?: string;
  tactic?: string;
  description?: string;
  sub_techniques?: string[];
}

export interface AttackDynamics {
  attack_vector?: string;
  attack_chain?: string[];
  ransomware_family?: string;
  data_exfiltration?: boolean;
  encryption_impact?: string;
  ransom_demanded?: boolean;
  ransom_amount?: number;
  ransom_paid?: boolean;
  recovery_timeframe_days?: number;
  business_impact?: string;
  operational_impact?: string[];
}

export interface IncidentSourceUrl {
  url: string;
  resolved_url?: string;
  url_kind?: string;
  is_wrapper?: boolean;
  is_primary_from_source?: boolean;
  is_resolved_primary?: boolean;
}

export interface IncidentSource {
  source: string;
  source_group?: string;
  source_event_id?: string;
  first_seen_at: string;
  source_published_at?: string;
  confidence?: string;
  is_primary_member?: boolean;
  raw_title?: string;
  raw_subtitle?: string;
  raw_institution_name?: string;
  source_urls?: IncidentSourceUrl[];
}

export interface SourceDisclosureScoreBreakdown {
  [key: string]: number;
}

export interface SourceDisclosureSourceSummary {
  source_enrichment_id?: string;
  source_incident_id?: string;
  source_name?: string;
  source_group?: string;
  raw_title?: string;
  raw_subtitle?: string;
  source_published_at?: string;
  is_primary_member?: boolean;
  survivor_score?: number;
  score_breakdown?: SourceDisclosureScoreBreakdown;
  field_count?: number;
  disclosed_fields?: string[];
  source_urls?: IncidentSourceUrl[];
}

export interface SourceDisclosureFieldSource {
  source_enrichment_id?: string;
  source_incident_id?: string;
  source_name?: string;
  is_primary_member?: boolean;
  has_value?: boolean;
  value?: unknown;
  display_value?: string | null;
}

export interface SourceDisclosureFieldDifference {
  field: string;
  label: string;
  selected_value?: unknown;
  selected_display_value?: string | null;
  selected_source_name?: string | null;
  resolved_value?: unknown;
  resolved_display_value?: string | null;
  resolved_source_enrichment_id?: string | null;
  resolved_source_name?: string | null;
  resolved_source_is_selected?: boolean | null;
  sources_with_value: number;
  sources_missing_value: number;
  distinct_value_count: number;
  has_disparity: boolean;
  reporting_sources: SourceDisclosureFieldSource[];
}

export interface SelectedSourceReason extends SourceDisclosureSourceSummary {
  selection_basis?: string;
  why_selected?: string[];
}

export interface SourceDisclosure {
  selected_source_reason?: SelectedSourceReason | null;
  source_summaries?: SourceDisclosureSourceSummary[];
  field_differences?: SourceDisclosureFieldDifference[];
}

export interface IncidentDetail {
  incident_id: string;
  institution_name: string;
  institution_type?: string;
  institution_size?: string;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  incident_date?: string;
  date_precision?: string;
  discovery_date?: string;
  source_published_date?: string;
  ingested_at?: string;
  title?: string;
  subtitle?: string;
  enriched_summary?: string;
  initial_access_description?: string;
  primary_url?: string;
  all_urls: string[];
  leak_site_url?: string;
  source_detail_url?: string;
  screenshot_url?: string;
  attack_type_hint?: string;
  attack_category?: string;
  incident_severity?: string;
  status: string;
  source_confidence: string;
  threat_actor?: string;
  threat_actor_name?: string;
  threat_actor_category?: string;
  threat_actor_motivation?: string;
  threat_actor_origin_country?: string;
  threat_actor_claim_url?: string;
  timeline?: TimelineEvent[];
  mitre_attack_techniques?: MITRETechnique[];
  attack_dynamics?: AttackDynamics;
  data_impact?: {
    data_breached?: boolean;
    data_exfiltrated?: boolean;
    data_categories?: string[];
    records_affected_exact?: number;
    records_affected_min?: number;
    records_affected_max?: number;
    pii_records_leaked?: number;
  };
  system_impact?: {
    systems_affected?: string[];
    critical_systems_affected?: boolean;
    network_compromised?: boolean;
    email_system_affected?: boolean;
    student_portal_affected?: boolean;
    research_systems_affected?: boolean;
    hospital_systems_affected?: boolean;
    cloud_services_affected?: boolean;
    third_party_vendor_impact?: boolean;
    vendor_name?: string;
  };
  user_impact?: {
    students_affected?: number;
    staff_affected?: number;
    faculty_affected?: number;
    alumni_affected?: number;
    total_individuals_affected?: number;
  };
  financial_impact?: {
    estimated_total_cost_usd?: number;
    ransom_cost_usd?: number;
    recovery_cost_usd?: number;
    legal_cost_usd?: number;
    insurance_claim?: boolean;
    insurance_payout_usd?: number;
  };
  regulatory_impact?: {
    applicable_regulations?: string[];
    gdpr_breach?: boolean;
    hipaa_breach?: boolean;
    ferpa_breach?: boolean;
    breach_notification_required?: boolean;
    notification_sent?: boolean;
    fine_imposed?: boolean;
    fine_amount_usd?: number;
    lawsuits_filed?: boolean;
    class_action_filed?: boolean;
  };
  recovery_metrics?: {
    recovery_method?: string;
    recovery_duration_days?: number;
    from_backup?: boolean;
    mfa_implemented?: boolean;
    law_enforcement_involved?: boolean;
    ir_firm_engaged?: string;
    forensics_firm?: string;
    security_improvements?: string;
  };
  transparency_metrics?: {
    public_disclosure?: boolean;
    public_disclosure_date?: string;
    disclosure_delay_days?: number;
    transparency_level?: string;
  };
  education_relevance?: {
    is_education_related?: boolean;
    education_confidence?: number;
  };
  llm_enriched: boolean;
  llm_enriched_at?: string;
  sources: IncidentSource[];
  source_disclosure?: SourceDisclosure;
  notes?: string;
}

export interface CountByCategory {
  category: string;
  count: number;
  percentage: number;
  country_code?: string;
  flag_emoji?: string;
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
}

export interface DashboardStats {
  total_incidents: number;
  education_incidents: number;
  enriched_incidents: number;
  unenriched_incidents: number;
  incidents_with_ransomware: number;
  incidents_with_data_breach: number;
  countries_affected: number;
  unique_threat_actors: number;
  unique_ransomware_families: number;
  data_sources: number;
  avg_recovery_days: number | null;
  total_financial_impact: number;
  incidents_with_mitre: number;
  last_updated: string;
}

export interface RecentIncident {
  incident_id: string;
  institution_name: string;
  country?: string;
  attack_category?: string;
  ransomware_family?: string;
  incident_date?: string;
  title?: string;
  enriched_summary?: string;
  threat_actor_name?: string;
}

export interface DashboardResponse {
  stats: DashboardStats;
  intelligence_summary: IntelligenceSummary;
  incidents_by_country: CountByCategory[];
  incidents_by_attack_type: CountByCategory[];
  incidents_by_ransomware: CountByCategory[];
  incidents_over_time: TimeSeriesPoint[];
  recent_incidents: RecentIncident[];
}

export interface IntelligenceRankedItem {
  count: number;
  percentage: number;
}

export interface IntelligenceFinding {
  title: string;
  value: string;
  context: string;
}

export interface IntelligenceCountry extends CountByCategory {}

export interface IntelligenceThreatActor extends ThreatActorSummary {}

export interface IntelligenceRecordEvent {
  incident_id: string;
  display_name: string;
  country?: string;
  country_code?: string;
  incident_date?: string;
  records_affected: number;
  attack_category?: string;
}

export interface IntelligenceSummary {
  overview: {
    total_incidents: number;
    actor_attributed_count: number;
    actor_attributed_share: number;
    ransomware_count: number;
    ransomware_share: number;
    breach_count: number;
    breach_share: number;
    vendor_linked_count: number;
    vendor_linked_share: number;
    known_record_events: number;
    known_record_volume: number;
  };
  tempo: {
    anchor_date?: string | null;
    recent_90d_count: number;
    prior_90d_count: number;
    recent_change_count: number;
    recent_change_pct?: number | null;
    recent_ransomware_count: number;
    recent_vendor_count: number;
    recent_breach_count: number;
  };
  victimology: {
    institution_segments: Array<IntelligenceRankedItem & { segment: string }>;
    top_countries: IntelligenceCountry[];
    vendor_linked_count: number;
    direct_victim_count: number;
  };
  tradecraft: {
    attack_clusters: Array<IntelligenceRankedItem & { cluster: string }>;
    attack_vectors: Array<IntelligenceRankedItem & { vector: string }>;
    attack_vector_known_count: number;
    attack_vector_known_share: number;
  };
  attribution: {
    top_threat_actors: IntelligenceThreatActor[];
    top_ransomware_families: CountByCategory[];
    actor_attributed_count: number;
    actor_attributed_share: number;
  };
  exposure: {
    breach_count: number;
    known_record_events: number;
    known_record_volume: number;
    largest_record_events: IntelligenceRecordEvent[];
  };
  coverage: {
    attack_vector_known_count: number;
    attack_vector_known_share: number;
    record_loss_known_count: number;
    record_loss_known_share: number;
    attribution_known_count: number;
    attribution_known_share: number;
  };
  priority_findings: IntelligenceFinding[];
}

export interface ThreatActorSummary {
  name: string;
  incident_count: number;
  countries_targeted: string[];
  ransomware_families: string[];
  first_seen?: string;
  last_seen?: string;
}

export interface ThreatActorsResponse {
  threat_actors: ThreatActorSummary[];
  total: number;
  returned: number;
  total_incidents: number;
  countries_targeted_total: number;
}

export interface FilterOptions {
  countries: string[];
  attack_categories: string[];
  ransomware_families: string[];
  threat_actors: string[];
  institution_types: string[];
  years: number[];
}

export interface IncidentListResponse {
  incidents: IncidentSummary[];
  pagination: PaginationMeta;
}

export interface AnalyticsBreakdownsResponse {
  countries: CountByCategory[];
  attack_categories: CountByCategory[];
  institution_types: CountByCategory[];
  severities: CountByCategory[];
}

export interface IncidentTrendResponse {
  bucket: "month" | "week" | "year";
  items: TimeSeriesPoint[];
}

interface RawIncidentTrendPoint {
  date?: string;
  count?: number;
  bucket_start?: string;
  incident_count?: number;
}

interface RawIncidentTrendResponse {
  bucket?: "month" | "week" | "year";
  items?: RawIncidentTrendPoint[];
  data?: RawIncidentTrendPoint[];
}

export interface IncidentBreakdownFilters {
  search?: string;
  country?: string;
  attack_category?: string;
  institution_type?: string;
  severity?: string;
  has_vendor?: boolean;
  is_education_related?: boolean;
  date_from?: string;
  date_to?: string;
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function toCountryCode(country?: string): string | undefined {
  if (!country) return undefined;
  const trimmed = country.trim();
  if (!trimmed) return undefined;
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return COUNTRY_NAME_TO_CODE[trimmed] || undefined;
}

function withQuery(endpoint: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${endpoint}?${query}` : endpoint;
}

function normalizeTrendResponse(payload: RawIncidentTrendResponse): IncidentTrendResponse {
  const rawItems = payload.items || payload.data || [];
  return {
    bucket: payload.bucket || "month",
    items: rawItems
      .map((item) => ({
        date: item.date || item.bucket_start || "",
        count:
          typeof item.count === "number"
            ? item.count
            : typeof item.incident_count === "number"
            ? item.incident_count
            : 0,
      }))
      .filter((item) => Boolean(item.date)),
  };
}

export async function getDashboard(): Promise<DashboardResponse> {
  return fetchAPI<DashboardResponse>("/api/v2/dashboard");
}

export async function getStats(): Promise<DashboardStats> {
  return fetchAPI<DashboardStats>("/api/v2/stats");
}

export async function getIntelligenceSummary(): Promise<IntelligenceSummary> {
  return fetchAPI<IntelligenceSummary>("/api/v2/analytics/intelligence");
}

export async function getIncidents(params: {
  page?: number;
  per_page?: number;
  country?: string;
  attack_category?: string;
  ransomware_family?: string;
  threat_actor?: string;
  institution_type?: string;
  year?: number;
  search?: string;
  sort_by?: string;
  sort_order?: string;
} = {}): Promise<IncidentListResponse> {
  const page = params.page || 1;
  const perPage = params.per_page || 25;
  const searchParams = new URLSearchParams();

  searchParams.set("format", "legacy");
  searchParams.set("limit", perPage.toString());
  searchParams.set("offset", ((page - 1) * perPage).toString());

  const countryCode = toCountryCode(params.country);
  if (countryCode) searchParams.set("country_code", countryCode);
  if (params.attack_category) searchParams.set("attack_category", params.attack_category);
  if (params.institution_type) searchParams.set("institution_type", params.institution_type);
  if (params.search) searchParams.set("search", params.search);
  if (!params.search && params.threat_actor) searchParams.set("search", params.threat_actor);
  if (params.sort_by) {
    const sortMap: Record<string, string> = {
      incident_date: "incident_date",
      institution_name: "institution_name",
      country: "country",
      attack_category: "severity",
    };
    searchParams.set("sort_by", sortMap[params.sort_by] || params.sort_by);
  }
  if (params.sort_order) searchParams.set("sort_order", params.sort_order);
  if (params.year) {
    searchParams.set("date_from", `${params.year}-01-01`);
    searchParams.set("date_to", `${params.year}-12-31`);
  }

  const response = await fetchAPI<IncidentListResponse>(withQuery("/api/v2/incidents", searchParams));
  return {
    incidents: response.incidents,
    pagination: {
      page,
      per_page: perPage,
      total: response.pagination.total,
      total_pages: Math.max(Math.ceil(response.pagination.total / perPage), 1),
      has_next: page * perPage < response.pagination.total,
      has_prev: page > 1,
    },
  };
}

export async function getIncident(id: string): Promise<IncidentDetail> {
  return fetchAPI<IncidentDetail>(`/api/v2/incidents/${id}?format=legacy`);
}

export async function getFilters(): Promise<FilterOptions> {
  return fetchAPI<FilterOptions>("/api/v2/filters");
}

export async function getThreatActors(limit: number = 20): Promise<ThreatActorsResponse> {
  return fetchAPI(`/api/v2/analytics/threat-actors?limit=${limit}`);
}

export async function getCountryAnalytics(
  limit: number = 20,
): Promise<{ data: CountByCategory[]; total: number }> {
  return fetchAPI(`/api/v2/analytics/countries?limit=${limit}`);
}

export async function getAttackTypeAnalytics(
  limit: number = 15,
): Promise<{ data: CountByCategory[]; total: number }> {
  return fetchAPI(`/api/v2/analytics/attack-types?limit=${limit}`);
}

export async function getRansomwareAnalytics(
  limit: number = 15,
): Promise<{ data: CountByCategory[]; total: number }> {
  return fetchAPI(`/api/v2/analytics/ransomware?limit=${limit}`);
}

export async function getTimelineAnalytics(
  months: number = 24,
): Promise<{ data: TimeSeriesPoint[]; total: number }> {
  const payload = await fetchAPI<RawIncidentTrendResponse>(`/api/v2/analytics/timeline?months=${months}`);
  const normalized = normalizeTrendResponse(payload);
  return {
    data: normalized.items,
    total: normalized.items.length,
  };
}

export async function getAnalyticsBreakdowns(
  filters: IncidentBreakdownFilters = {},
): Promise<AnalyticsBreakdownsResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  const countryCode = toCountryCode(filters.country);
  if (countryCode) params.set("country_code", countryCode);
  if (filters.attack_category) params.set("attack_category", filters.attack_category);
  if (filters.institution_type) params.set("institution_type", filters.institution_type);
  if (filters.severity) params.set("severity", filters.severity);
  if (filters.has_vendor !== undefined) params.set("has_vendor", String(filters.has_vendor));
  if (filters.is_education_related !== undefined) {
    params.set("is_education_related", String(filters.is_education_related));
  }
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  return fetchAPI<AnalyticsBreakdownsResponse>(withQuery("/api/v2/analytics/breakdowns", params));
}

export async function getIncidentTrend(
  filters: IncidentBreakdownFilters & {
    bucket?: "month" | "week" | "year";
    limit?: number;
  } = {},
): Promise<IncidentTrendResponse> {
  const params = new URLSearchParams();
  params.set("bucket", filters.bucket || "month");
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.search) params.set("search", filters.search);
  const countryCode = toCountryCode(filters.country);
  if (countryCode) params.set("country_code", countryCode);
  if (filters.attack_category) params.set("attack_category", filters.attack_category);
  if (filters.institution_type) params.set("institution_type", filters.institution_type);
  if (filters.severity) params.set("severity", filters.severity);
  if (filters.has_vendor !== undefined) params.set("has_vendor", String(filters.has_vendor));
  if (filters.is_education_related !== undefined) {
    params.set("is_education_related", String(filters.is_education_related));
  }
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  const payload = await fetchAPI<RawIncidentTrendResponse>(withQuery("/api/v2/analytics/trend", params));
  return normalizeTrendResponse(payload);
}
