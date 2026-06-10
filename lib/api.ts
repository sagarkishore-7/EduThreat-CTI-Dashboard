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
  region?: string;
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
  diamond_summary?: DiamondSummary;
  incidents_by_country: CountByCategory[];
  incidents_by_attack_type: CountByCategory[];
  incidents_by_ransomware: CountByCategory[];
  incidents_over_time: TimeSeriesPoint[];
  recent_incidents: RecentIncident[];
}

export interface DiamondSummary {
  overview: {
    total_incidents: number;
    incidents_with_all_core_vertices?: number;
    incidents_with_all_core_vertices_share?: number;
  };
  coverage: {
    victim_vertex_count?: number;
    adversary_vertex_count?: number;
    capability_vertex_count?: number;
    infrastructure_vertex_count?: number;
    all_core_vertices_count?: number;
    victim_vertex_share?: number;
    adversary_vertex_share?: number;
    capability_vertex_share?: number;
    infrastructure_vertex_share?: number;
    all_core_vertices_share?: number;
  };
  vertices?: {
    top_adversaries?: Array<{ name: string; count: number; percentage?: number }>;
    top_capabilities?: Array<{ name: string; count: number; percentage?: number }>;
    top_victims?: Array<{ name: string; count: number; percentage?: number }>;
    infrastructure_components?: Array<{ component: string; count: number; percentage?: number }>;
  };
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

export interface MitreTacticAnalytics {
  tactic: string;
  incident_count: number;
  incident_percentage: number;
  technique_count: number;
}

export interface MitreTechniqueAnalytics {
  tactic: string;
  technique_id: string;
  technique_name: string;
  count: number;
  percentage: number;
}

export interface MitreAnalyticsResponse {
  overview: {
    total_incidents: number;
    incidents_with_mitre: number;
    incidents_with_mitre_share: number;
    technique_count_total: number;
    unique_tactic_count: number;
    unique_technique_count: number;
  };
  tactics: MitreTacticAnalytics[];
  techniques: MitreTechniqueAnalytics[];
  top_techniques_by_tactic: Array<{
    tactic: string;
    techniques: Array<{
      technique_id: string;
      technique_name: string;
      count: number;
      percentage: number;
    }>;
  }>;
}

export interface PipelineResearchMetricsResponse {
  captured_at?: string;
  dataset_construction: {
    source_incidents_total: number;
    selected_article_sources_total: number;
    article_documents_total: number;
    source_enrichments_total: number;
    canonicalized_sources_total: number;
    canonical_incidents_total: number;
    duplicate_sources_collapsed: number;
    source_to_selected_article_pct: number;
    source_to_enrichment_pct: number;
    source_to_canonical_pct: number;
    deduplication_reduction_pct: number;
    avg_members_per_canonical: number;
    median_members_per_canonical: number;
    max_members_per_canonical: number;
  };
  fetch_performance: {
    overall: {
      attempts_total: number;
      successes_total: number;
      failures_total: number;
      success_rate_pct: number;
      selected_successes_total: number;
      fallback_selected_share_pct: number;
    };
    richness_comparison?: {
      richest_selected_tier?: string | null;
      oxylabs_selected_avg_chars?: number;
      newspaper3k_selected_avg_chars?: number;
      oxylabs_vs_newspaper3k_selected_char_delta?: number;
      oxylabs_vs_newspaper3k_selected_char_gain_pct?: number;
    };
    tiers?: Array<{
      fetch_tier: string;
      attempts?: number;
      attempts_total?: number;
      attempt_share_pct?: number;
      successes?: number;
      success_rate_pct: number;
      selected_successes?: number;
      selected_successes_total?: number;
      selected_share_pct?: number;
      latency_ms?: Record<string, number>;
      success_content_length_chars?: Record<string, number>;
      selected_content_length_chars?: Record<string, number>;
      selected_avg_chars?: number;
    }>;
  };
  pipeline_performance: {
    expired_leases_current: number;
    queue_backlog_current: Array<{
      task_type: string;
      status: string;
      task_count: number;
    }>;
  };
  dataset_quality: {
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
    attack_vector_known_count: number;
    attack_vector_known_share: number;
    record_loss_known_count: number;
    record_loss_known_share: number;
  };
  intelligence_summary: IntelligenceSummary;
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

/** Default request timeout (ms). Heavy analytics are cached server-side, so a
 *  request that exceeds this is almost certainly stuck — fail fast rather than
 *  leave the UI spinning. Override per-call via options.signal. */
const DEFAULT_TIMEOUT_MS = 25_000;

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // Combine any caller-provided signal with a timeout signal.
  const timeout = AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  const signal = options?.signal
    ? (AbortSignal as unknown as { any: (s: AbortSignal[]) => AbortSignal }).any([options.signal, timeout])
    : timeout;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      signal,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new Error(`API timeout after ${DEFAULT_TIMEOUT_MS / 1000}s: ${endpoint}`);
    }
    throw err;
  }

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

export async function getMitreAnalytics(
  options: { technique_limit?: number; per_tactic_limit?: number } = {},
): Promise<MitreAnalyticsResponse> {
  const params = new URLSearchParams();
  if (options.technique_limit) params.set("technique_limit", String(options.technique_limit));
  if (options.per_tactic_limit) params.set("per_tactic_limit", String(options.per_tactic_limit));
  return fetchAPI<MitreAnalyticsResponse>(withQuery("/api/v2/analytics/mitre", params));
}

export async function getPipelineResearchMetrics(): Promise<PipelineResearchMetricsResponse> {
  return fetchAPI<PipelineResearchMetricsResponse>("/api/v2/analytics/pipeline-research");
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

export interface KpiTrend {
  series: TimeSeriesPoint[];
  values: number[];
  total: number;
  current: number;
  previous: number;
  delta_pct: number | null;
}

export type KpiTrendsResponse = Record<
  "incidents" | "ransomware" | "breaches" | "actors" | "supply_chain" | "countries",
  KpiTrend
>;

export async function getKpiTrends(months: number = 12): Promise<KpiTrendsResponse> {
  return fetchAPI<KpiTrendsResponse>(`/api/v2/analytics/kpi-trends?months=${months}`);
}

// ── Campaigns ─────────────────────────────────────────────────────────────
export interface CampaignSummary {
  campaign_id: string;
  campaign_name: string;
  campaign_type:
    | "same_campaign"
    | "shared_vendor_incident"
    | "mass_exploitation"
    | "actor_activity_wave"
    | "roundup_not_campaign"
    | "unrelated";
  status: "candidate" | "analyst_reviewed" | "suppressed";
  first_seen_date?: string | null;
  last_seen_date?: string | null;
  actors: string[];
  vendors: string[];
  platforms: string[];
  cves: string[];
  attack_categories: string[];
  member_count: number;
  confirmed_member_count: number;
  confidence: number | null;
  analyst_summary?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CampaignListResponse {
  items: CampaignSummary[];
  meta: { limit: number; offset: number; returned: number; total: number };
}

export type CampaignMemberRole =
  | "direct_victim"
  | "affected_via_vendor"
  | "vendor_operator"
  | "mentioned_only"
  | "needs_review";

export interface CampaignMembership {
  membership_id: string;
  canonical_incident_id: string;
  role: CampaignMemberRole;
  confidence: number | null;
  review_status: string;
  victim_name?: string | null;
  canonical_status?: string | null;
  reasons: string[];
}

export interface CampaignDetailResponse {
  campaign: CampaignSummary;
  memberships: CampaignMembership[];
  evidence_items: unknown[];
}

export interface CampaignGraphNode {
  id: string;
  type: "vendor" | "actor" | "cve" | "platform" | string;
  label: string;
  size: number;
  /** Column index for the left-to-right flow (0 = asset/root, 1 = CVE, 2 = actor). */
  layer?: number;
  confidence?: number;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface CampaignGraphEdge {
  source: string;
  target: string;
  /** Typed attack-chain relation (has_vuln, exploited_by, targeted_by). */
  relation?: string;
  type?: string;
  [k: string]: unknown;
}

export interface CampaignVictimGroup {
  key: string;
  label: string;
  via: "platform" | "vendor" | "direct" | string;
  count: number;
  institutions: Array<{
    canonical_incident_id: string;
    victim_name: string;
    role: string | null;
    confidence: number | null;
  }>;
}

export interface CampaignGraphResponse {
  campaign: CampaignSummary;
  nodes: CampaignGraphNode[];
  edges: CampaignGraphEdge[];
  victim_groups?: CampaignVictimGroup[];
  meta?: {
    layout?: string;
    roots?: string[];
    [k: string]: unknown;
  };
}

export async function getCampaigns(limit = 50): Promise<CampaignListResponse> {
  return fetchAPI<CampaignListResponse>(`/api/v2/campaigns?limit=${limit}`);
}

export async function getCampaignDetail(id: string): Promise<CampaignDetailResponse> {
  return fetchAPI<CampaignDetailResponse>(`/api/v2/campaigns/${encodeURIComponent(id)}`);
}

export async function getCampaignGraph(id: string): Promise<CampaignGraphResponse> {
  return fetchAPI<CampaignGraphResponse>(`/api/v2/campaigns/${encodeURIComponent(id)}/graph`);
}

export interface FeedHealthItem {
  source: string;
  group: string;
  events_total: number;
  events_30d: number;
  last_collected_at: string | null;
  last_published_at: string | null;
  age_days: number | null;
  status: "healthy" | "stale" | "offline";
}

export interface FeedHealthResponse {
  summary: {
    feed_count: number;
    healthy: number;
    stale: number;
    offline: number;
    events_total: number;
    events_30d: number;
  };
  by_group: Array<{ group: string; events: number }>;
  feeds: FeedHealthItem[];
}

export async function getFeedHealth(limit: number = 50): Promise<FeedHealthResponse> {
  return fetchAPI<FeedHealthResponse>(`/api/v2/analytics/feeds?limit=${limit}`);
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
  const raw = await fetchAPI<RawBreakdownsResponse>(
    withQuery("/api/v2/analytics/breakdowns", params),
  );
  return {
    countries: normalizeBreakdown(raw.countries, "country"),
    attack_categories: normalizeBreakdown(raw.attack_categories, "attack_category"),
    institution_types: normalizeBreakdown(raw.institution_types, "institution_type"),
    severities: normalizeBreakdown(raw.severities, "severity"),
  };
}

interface RawBreakdownItem {
  country?: string;
  country_code?: string;
  attack_category?: string;
  institution_type?: string;
  severity?: string;
  incident_count?: number;
  count?: number;
  percentage?: number;
  flag_emoji?: string;
}

interface RawBreakdownsResponse {
  countries?: RawBreakdownItem[];
  attack_categories?: RawBreakdownItem[];
  institution_types?: RawBreakdownItem[];
  severities?: RawBreakdownItem[];
}

/** Map the backend breakdown shape ({<dimension>, incident_count}) onto the
 *  CountByCategory shape ({category, count, percentage}) the charts expect, and
 *  compute the percentage when the backend omits it.
 *
 *  The backend now serves breakdowns from the normalized star-schema layer
 *  (one row per controlled-vocabulary value), so this is a straight field map.
 *  A defensive case-insensitive merge is retained so any legacy mixed-case rows
 *  from the fallback path still collapse rather than double-count. */
function normalizeBreakdown(
  rows: RawBreakdownItem[] | undefined,
  key: "country" | "attack_category" | "institution_type" | "severity",
): CountByCategory[] {
  if (!rows || rows.length === 0) return [];
  const total = rows.reduce((sum, r) => sum + (r.incident_count ?? r.count ?? 0), 0) || 1;
  const merged = new Map<string, { category: string; count: number; country_code?: string; flag_emoji?: string }>();
  for (const r of rows) {
    const label = (r[key] ?? "").toString().trim() || "Unknown";
    const dedupeKey = label.toLowerCase();
    const count = r.incident_count ?? r.count ?? 0;
    const existing = merged.get(dedupeKey);
    if (existing) {
      existing.count += count;
    } else {
      merged.set(dedupeKey, { category: label, count, country_code: r.country_code, flag_emoji: r.flag_emoji });
    }
  }
  return Array.from(merged.values())
    .sort((a, b) => b.count - a.count)
    .map((m) => ({
      category: m.category,
      count: m.count,
      percentage: Math.round((m.count / total) * 1000) / 10,
      country_code: m.country_code,
      flag_emoji: m.flag_emoji,
    }));
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
