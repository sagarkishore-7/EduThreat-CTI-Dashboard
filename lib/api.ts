/**
 * API client for EduThreat-CTI backend
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  university_name: string;
  victim_raw_name?: string;
  institution_type?: string;
  country?: string;
  region?: string;
  city?: string;
  incident_date?: string;
  date_precision?: string;
  title?: string;
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
  university_name: string;
  victim_raw_name?: string;
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
  enriched_incidents: number;
  unenriched_incidents: number;
  incidents_with_ransomware: number;
  incidents_with_data_breach: number;
  countries_affected: number;
  unique_threat_actors: number;
  unique_ransomware_families: number;
  last_updated: string;
}

export interface RecentIncident {
  incident_id: string;
  university_name: string;
  country?: string;
  attack_category?: string;
  ransomware_family?: string;
  incident_date?: string;
  title?: string;
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

