/**
 * API client for EduThreat-CTI backend
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

export interface IncidentSource {
  source: string;
  source_event_id?: string;
  first_seen_at: string;
  confidence?: string;
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
  attack_type_hint?: string;
  attack_category?: string;
  incident_severity?: string;
  status: string;
  source_confidence: string;
  threat_actor_name?: string;
  threat_actor_category?: string;
  threat_actor_motivation?: string;
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
    law_enforcement_involved?: boolean;
    ir_firm_engaged?: string;
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
  incidents_by_country: CountByCategory[];
  incidents_by_attack_type: CountByCategory[];
  incidents_by_ransomware: CountByCategory[];
  incidents_over_time: TimeSeriesPoint[];
  recent_incidents: RecentIncident[];
}

export interface ThreatActorSummary {
  name: string;
  incident_count: number;
  countries_targeted: string[];
  ransomware_families: string[];
  first_seen?: string;
  last_seen?: string;
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

// API Functions
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

export async function getDashboard(): Promise<DashboardResponse> {
  return fetchAPI<DashboardResponse>('/api/dashboard');
}

export async function getStats(): Promise<DashboardStats> {
  return fetchAPI<DashboardStats>('/api/stats');
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
  enriched_only?: boolean;
  data_breached?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: string;
} = {}): Promise<IncidentListResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.per_page) searchParams.set('per_page', params.per_page.toString());
  if (params.country) searchParams.set('country', params.country);
  if (params.attack_category) searchParams.set('attack_category', params.attack_category);
  if (params.ransomware_family) searchParams.set('ransomware_family', params.ransomware_family);
  if (params.threat_actor) searchParams.set('threat_actor', params.threat_actor);
  if (params.institution_type) searchParams.set('institution_type', params.institution_type);
  if (params.year) searchParams.set('year', params.year.toString());
  if (params.enriched_only) searchParams.set('enriched_only', 'true');
  if (params.data_breached) searchParams.set('data_breached', 'true');
  if (params.search) searchParams.set('search', params.search);
  if (params.sort_by) searchParams.set('sort_by', params.sort_by);
  if (params.sort_order) searchParams.set('sort_order', params.sort_order);
  
  const query = searchParams.toString();
  return fetchAPI<IncidentListResponse>(`/api/incidents${query ? `?${query}` : ''}`);
}

export async function getIncident(id: string): Promise<IncidentDetail> {
  return fetchAPI<IncidentDetail>(`/api/incidents/${id}`);
}

export async function getFilters(): Promise<FilterOptions> {
  return fetchAPI<FilterOptions>('/api/filters');
}

export async function getThreatActors(limit: number = 20): Promise<{ threat_actors: ThreatActorSummary[]; total: number }> {
  return fetchAPI(`/api/analytics/threat-actors?limit=${limit}`);
}

export async function getCountryAnalytics(limit: number = 20): Promise<{ data: CountByCategory[]; total: number }> {
  return fetchAPI(`/api/analytics/countries?limit=${limit}`);
}

export async function getAttackTypeAnalytics(limit: number = 15): Promise<{ data: CountByCategory[]; total: number }> {
  return fetchAPI(`/api/analytics/attack-types?limit=${limit}`);
}

export async function getRansomwareAnalytics(limit: number = 15): Promise<{ data: CountByCategory[]; total: number }> {
  return fetchAPI(`/api/analytics/ransomware?limit=${limit}`);
}

export async function getTimelineAnalytics(months: number = 24): Promise<{ data: TimeSeriesPoint[]; total: number }> {
  return fetchAPI(`/api/analytics/timeline?months=${months}`);
}

// ============================================================
// Advanced Analytics Types
// ============================================================

export interface AttackTrendPoint {
  month: string;
  attack_category: string | null;
  count: number;
}

export interface MitreTacticItem {
  tactic: string;
  count: number;
  techniques: string[];
}

export interface RansomwareTimelineItem {
  family: string;
  incident_count: number;
  first_seen?: string;
  last_seen?: string;
}

export interface RansomwareFamilyDetail {
  family: string;
  incident_count: number;
  exfiltration_count: number;
  exfiltration_rate: number;
  avg_ransom: number | null;
  countries: string[];
  first_seen?: string;
  last_seen?: string;
}

export interface RansomEconomics {
  total_ransomware: number;
  demanded_count: number;
  paid_count: number;
  payment_rate: number;
  total_demanded: number | null;
  avg_demanded: number | null;
  max_demanded: number | null;
  total_paid: number | null;
  avg_paid: number | null;
}

export interface RecoveryComparison {
  avg_recovery_days: number;
  avg_downtime_days: number;
  backup_rate: number;
  ir_firm_rate: number;
  forensics_rate: number;
  total: number;
}

export interface RecoveryComparisonResponse {
  ransomware: RecoveryComparison;
  other: RecoveryComparison;
}

export interface RansomwareGeoItem {
  family: string;
  countries: { country: string; count: number }[];
}

export interface ActorTimelinePoint {
  actor: string;
  month: string;
  count: number;
}

export interface ActorRansomwareMatrix {
  actors: string[];
  families: string[];
  matrix: { actor: string; family: string; count: number }[];
}

export interface ActorTargetingItem {
  actor: string;
  countries: { country: string; count: number }[];
}

export interface DataImpactStats {
  total: number;
  breached_count: number;
  exfiltrated_count: number;
  breach_rate: number;
  exfiltration_rate: number;
  total_records: number | null;
  avg_records: number | null;
  max_records: number | null;
  total_pii_leaked: number | null;
}

export interface RegulatoryImpactStats {
  total: number;
  gdpr_count: number;
  hipaa_count: number;
  ferpa_count: number;
  notification_required: number;
  notifications_sent: number;
  fines_imposed: number;
  total_fines: number | null;
  lawsuits_count: number;
  class_action_count: number;
}

export interface RecoveryEffectiveness {
  total: number;
  avg_recovery_days: number | null;
  avg_downtime_days: number | null;
  backup_count: number;
  backup_rate: number;
  ir_firm_count: number;
  ir_firm_rate: number;
  forensics_count: number;
  forensics_rate: number;
  mfa_post_count: number;
  mfa_adoption_rate: number;
}

export interface TransparencyStats {
  total: number;
  disclosed_count: number;
  disclosure_rate: number;
  avg_delay_days: number | null;
  levels: { level: string; count: number }[];
}

export interface UserImpactTotals {
  students: number | null;
  staff: number | null;
  faculty: number | null;
  total_individuals: number | null;
  incidents_with_data: number;
}

export interface FinancialImpactByYear {
  year: string | null;
  ransom_cost: number | null;
  recovery_cost: number | null;
  legal_cost: number | null;
  notification_cost: number | null;
  incident_count: number;
}

export interface OperationalImpactItem {
  category: string;
  count: number;
  percentage: number;
}

// ============================================================
// Advanced Analytics Fetch Functions
// ============================================================

export async function getAttackTrends(months: number = 36): Promise<{ data: AttackTrendPoint[]; total: number }> {
  return fetchAPI(`/api/analytics/attack-trends?months=${months}`);
}

export async function getAttackVectors(limit: number = 10): Promise<{ data: CountByCategory[]; total: number }> {
  return fetchAPI(`/api/analytics/attack-vectors?limit=${limit}`);
}

export async function getMitreTactics(): Promise<{ data: MitreTacticItem[]; total: number }> {
  return fetchAPI('/api/analytics/mitre-tactics');
}

export async function getInitialAccess(limit: number = 12): Promise<{ data: CountByCategory[]; total: number }> {
  return fetchAPI(`/api/analytics/initial-access?limit=${limit}`);
}

export async function getSystemImpact(): Promise<{ data: CountByCategory[]; total: number }> {
  return fetchAPI('/api/analytics/system-impact');
}

export async function getRansomwareTimeline(limit: number = 15): Promise<{ data: RansomwareTimelineItem[]; total: number }> {
  return fetchAPI(`/api/analytics/ransomware-timeline?limit=${limit}`);
}

export async function getRansomwareFamiliesDetail(limit: number = 15): Promise<{ data: RansomwareFamilyDetail[]; total: number }> {
  return fetchAPI(`/api/analytics/ransomware-families-detail?limit=${limit}`);
}

export async function getRansomEconomics(): Promise<RansomEconomics> {
  return fetchAPI('/api/analytics/ransom-economics');
}

export async function getRansomwareRecovery(): Promise<RecoveryComparisonResponse> {
  return fetchAPI('/api/analytics/ransomware-recovery');
}

export async function getRansomwareGeo(): Promise<RansomwareGeoItem[]> {
  return fetchAPI('/api/analytics/ransomware-geo');
}

export async function getThreatActorCategories(): Promise<{ data: CountByCategory[]; total: number }> {
  return fetchAPI('/api/analytics/threat-actor-categories');
}

export async function getThreatActorMotivations(): Promise<{ data: CountByCategory[]; total: number }> {
  return fetchAPI('/api/analytics/threat-actor-motivations');
}

export async function getThreatActorTimeline(limit: number = 10): Promise<{ data: ActorTimelinePoint[]; total: number }> {
  return fetchAPI(`/api/analytics/threat-actor-timeline?limit=${limit}`);
}

export async function getActorRansomwareMatrix(): Promise<ActorRansomwareMatrix> {
  return fetchAPI('/api/analytics/actor-ransomware-matrix');
}

export async function getActorTargeting(limit: number = 10): Promise<ActorTargetingItem[]> {
  return fetchAPI(`/api/analytics/actor-targeting?limit=${limit}`);
}

export async function getInstitutionTypes(): Promise<{ data: CountByCategory[]; total: number }> {
  return fetchAPI('/api/analytics/institution-types');
}

export async function getOperationalImpact(): Promise<{ data: OperationalImpactItem[]; total: number }> {
  return fetchAPI('/api/analytics/operational-impact');
}

export async function getFinancialImpact(): Promise<{ data: FinancialImpactByYear[]; total: number }> {
  return fetchAPI('/api/analytics/financial-impact');
}

export async function getDataImpact(): Promise<DataImpactStats> {
  return fetchAPI('/api/analytics/data-impact');
}

export async function getRegulatoryImpact(): Promise<RegulatoryImpactStats> {
  return fetchAPI('/api/analytics/regulatory-impact');
}

export async function getRecoveryMetrics(): Promise<RecoveryEffectiveness> {
  return fetchAPI('/api/analytics/recovery-metrics');
}

export async function getTransparencyMetrics(): Promise<TransparencyStats> {
  return fetchAPI('/api/analytics/transparency-metrics');
}

export async function getUserImpact(): Promise<UserImpactTotals> {
  return fetchAPI('/api/analytics/user-impact');
}

// ============================================================
// Admin / Debug Raw Data Viewer
// ============================================================

export interface RawIncidentFilters {
  incident_id?: string;
  has_mitre?: boolean;
  attack_category?: string;
  country?: string;
  has_enrichment?: boolean;
  limit?: number;
  offset?: number;
}

export interface RawIncidentResponse {
  total: number;
  limit: number;
  offset: number;
  incidents: Record<string, unknown>[];
}

export async function getRawIncidents(filters: RawIncidentFilters = {}): Promise<RawIncidentResponse> {
  const params = new URLSearchParams();
  if (filters.incident_id) params.set('incident_id', filters.incident_id);
  if (filters.has_mitre !== undefined) params.set('has_mitre', String(filters.has_mitre));
  if (filters.attack_category) params.set('attack_category', filters.attack_category);
  if (filters.country) params.set('country', filters.country);
  if (filters.has_enrichment !== undefined) params.set('has_enrichment', String(filters.has_enrichment));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));
  return fetchAPI(`/api/admin/raw-incidents?${params.toString()}`);
}

// ============================================================
// Extended Cross-Dimensional Analytics
// ============================================================

export interface InstitutionRiskItem {
  institution_type: string;
  attack_category: string;
  count: number;
}

export interface RecoveryByAttackTypeItem {
  attack_category: string;
  avg_recovery_days: number | null;
  avg_downtime_days: number | null;
  incident_count: number;
}

export interface AttackVectorByInstitutionResponse {
  institution_types: string[];
  vectors: string[];
  data: { institution_type: string; attack_vector: string; count: number }[];
}

export interface BreachSeverityPoint {
  month: string;
  incident_count: number;
  avg_records: number | null;
  breach_count: number;
}

export interface RansomPaymentByYearItem {
  year: string | null;
  total_incidents: number;
  demanded_count: number;
  paid_count: number;
  total_demanded: number | null;
  total_paid: number | null;
  payment_rate: number;
}

export interface RansomwareFamilyTrendResponse {
  families: string[];
  data: { month: string; family: string; count: number }[];
}

export interface ActorInstitutionResponse {
  actors: string[];
  institution_types: string[];
  data: { actor: string; institution_type: string; count: number }[];
}

export interface ActorTTPResponse {
  actors: string[];
  tactics: string[];
  data: { actor: string; tactic: string; count: number }[];
}

export interface DisclosureTimelinePoint {
  incident_date: string;
  disclosure_delay_days: number;
  country: string;
  transparency_level: string | null;
}

export interface BreachByInstitutionItem {
  institution_type: string;
  total_incidents: number;
  breach_count: number;
  breach_rate: number;
  avg_records: number | null;
  total_records: number | null;
}

export async function getInstitutionRiskMatrix(): Promise<InstitutionRiskItem[]> {
  return fetchAPI('/api/analytics/institution-risk-matrix');
}

export async function getRecoveryByAttackType(): Promise<RecoveryByAttackTypeItem[]> {
  return fetchAPI('/api/analytics/recovery-by-attack-type');
}

export async function getAttackVectorByInstitution(limit: number = 8): Promise<AttackVectorByInstitutionResponse> {
  return fetchAPI(`/api/analytics/attack-vector-by-institution?limit=${limit}`);
}

export async function getBreachSeverityTimeline(months: number = 60): Promise<BreachSeverityPoint[]> {
  return fetchAPI(`/api/analytics/breach-severity-timeline?months=${months}`);
}

export async function getRansomPaymentByYear(): Promise<RansomPaymentByYearItem[]> {
  return fetchAPI('/api/analytics/ransom-payment-by-year');
}

export async function getRansomwareFamilyTrend(limit: number = 8): Promise<RansomwareFamilyTrendResponse> {
  return fetchAPI(`/api/analytics/ransomware-family-trend?limit=${limit}`);
}

export async function getActorInstitutionTargeting(limit: number = 12): Promise<ActorInstitutionResponse> {
  return fetchAPI(`/api/analytics/actor-institution-targeting?limit=${limit}`);
}

export async function getActorTTPProfile(limit: number = 8): Promise<ActorTTPResponse> {
  return fetchAPI(`/api/analytics/actor-ttp-profile?limit=${limit}`);
}

export async function getDisclosureTimeline(): Promise<DisclosureTimelinePoint[]> {
  return fetchAPI('/api/analytics/disclosure-timeline');
}

export async function getBreachByInstitutionType(): Promise<BreachByInstitutionItem[]> {
  return fetchAPI('/api/analytics/breach-by-institution-type');
}

// ============================================================
// Interactive Nivo Visualization Types & Fetchers
// ============================================================

export interface SankeyNode {
  id: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface AttackFlowResponse {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface MitreSunburstNode {
  id: string;
  value?: number;
  children?: MitreSunburstNode[];
}

export interface ActorNetworkNode {
  id: string;
  radius: number;
  count: number;
  families: string[];
}

export interface ActorNetworkLink {
  source: string;
  target: string;
  distance: number;
  shared_families: string[];
}

export interface ActorNetworkResponse {
  nodes: ActorNetworkNode[];
  links: ActorNetworkLink[];
}

export interface RansomFlowResponse {
  nodes: SankeyNode[];
  links_by_count: SankeyLink[];
  links_by_amount: SankeyLink[];
}

export interface CountryAttackMatrixResponse {
  keys: string[];
  matrix: number[][];
}

export async function getAttackFlow(): Promise<AttackFlowResponse> {
  return fetchAPI('/api/analytics/attack-flow');
}

export async function getMitreSunburst(): Promise<MitreSunburstNode> {
  return fetchAPI('/api/analytics/mitre-sunburst');
}

export async function getActorNetwork(): Promise<ActorNetworkResponse> {
  return fetchAPI('/api/analytics/actor-network');
}

export async function getRansomFlow(): Promise<RansomFlowResponse> {
  return fetchAPI('/api/analytics/ransom-flow');
}

export async function getCountryAttackMatrix(): Promise<CountryAttackMatrixResponse> {
  return fetchAPI('/api/analytics/country-attack-matrix');
}
