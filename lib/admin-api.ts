import { API_BASE } from "@/lib/api";

export const ADMIN_SESSION_KEY = "v2_admin_session_token";

export interface V2LoginResponse {
  success: boolean;
  session_token: string;
  expires_at: string;
  message: string;
}

export interface V2RuntimeStatus {
  counts: {
    source_incidents: number;
    article_documents: number;
    selected_article_sources?: number;
    article_fetch_attempts?: number;
    successful_article_fetch_attempts?: number;
    source_enrichments: number;
    canonical_incidents: number;
  };
  queue_health: {
    expired_leases: number;
  };
  task_summary: V2TaskSummaryRow[];
  recent_tasks: Array<Record<string, unknown>>;
  recent_runs: Array<Record<string, unknown>>;
  dashboard_snapshot: {
    last_refreshed_at: string | null;
    needs_refresh: boolean | null;
  };
}

export interface V2TaskSummaryRow {
  task_type: string;
  status: string;
  task_count: number;
}

export interface V2PlanDefinition {
  name: string;
  description?: string;
  collect?: Record<string, unknown>;
  drain_tasks?: boolean;
  worker_max_tasks?: number | null;
}

export interface V2ManualReviewQueueResponse {
  items: Array<Record<string, unknown>>;
  meta: {
    limit: number;
    returned: number;
    total?: number;
  };
}

export interface V2ConsistencyCandidatesResponse {
  items: Array<Record<string, unknown>>;
  meta: {
    limit: number;
    scan_limit: number;
    returned: number;
  };
}

export interface V2RejectedEnrichmentsResponse {
  items: Array<Record<string, unknown>>;
  meta: {
    limit: number;
    returned: number;
    total?: number;
  };
}

function buildAdminHeaders(token?: string, extra?: HeadersInit): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(token ? { "X-Session-Token": token } : {}),
    ...extra,
  };
}

export class AdminAuthError extends Error {
  status: number;

  constructor(message: string = "Session expired. Please sign in again.") {
    super(message);
    this.name = "AdminAuthError";
    this.status = 401;
  }
}

export function isAdminAuthError(error: unknown): error is AdminAuthError {
  return error instanceof AdminAuthError || (error instanceof Error && error.name === "AdminAuthError");
}

async function adminRequest<T>(
  endpoint: string,
  token?: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: buildAdminHeaders(token, options?.headers),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    if (response.status === 401) {
      setStoredAdminSession(null);
      throw new AdminAuthError(detail.detail || "Session expired. Please sign in again.");
    }

    const error = new Error(detail.detail || `${response.status} ${response.statusText}`) as Error & {
      status?: number;
    };
    error.name = "AdminRequestError";
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export function getStoredAdminSession(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ADMIN_SESSION_KEY);
}

export function setStoredAdminSession(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(ADMIN_SESSION_KEY, token);
    return;
  }
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
}

export async function loginV2Admin(username: string, password: string): Promise<V2LoginResponse> {
  return adminRequest<V2LoginResponse>("/api/admin/v2/login", undefined, {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function logoutV2Admin(token: string): Promise<{ success: boolean; message: string }> {
  return adminRequest("/api/admin/v2/logout", token, {
    method: "POST",
  });
}

export async function getV2Preflight(token: string): Promise<Record<string, unknown>> {
  return adminRequest("/api/admin/v2/preflight", token);
}

export async function getV2RuntimeStatus(token: string): Promise<V2RuntimeStatus> {
  return adminRequest("/api/admin/v2/status", token);
}

export async function getV2Tasks(
  token: string,
  params: { limit?: number; task_type?: string; status?: string[] } = {},
): Promise<Record<string, unknown>> {
  const search = new URLSearchParams();
  if (params.limit) search.set("limit", String(params.limit));
  if (params.task_type) search.set("task_type", params.task_type);
  for (const value of params.status || []) search.append("status", value);
  const query = search.toString();
  return adminRequest(`/api/admin/v2/tasks${query ? `?${query}` : ""}`, token);
}

export async function getV2Runs(
  token: string,
  params: { limit?: number; status?: string[] } = {},
): Promise<Record<string, unknown>> {
  const search = new URLSearchParams();
  if (params.limit) search.set("limit", String(params.limit));
  for (const value of params.status || []) search.append("status", value);
  const query = search.toString();
  return adminRequest(`/api/admin/v2/runs${query ? `?${query}` : ""}`, token);
}

export async function getV2Plans(token: string): Promise<{ items: V2PlanDefinition[] }> {
  return adminRequest("/api/admin/v2/plans", token);
}

export async function cancelV2Task(token: string, taskId: string): Promise<Record<string, unknown>> {
  return adminRequest(`/api/admin/v2/tasks/${encodeURIComponent(taskId)}/cancel`, token, {
    method: "POST",
  });
}

export interface V2ClassifierQuality {
  title_relevance: { pending: number; relevant: number; irrelevant: number; llm_classified: number };
  second_gate: {
    llm_gated: {
      true_positive: number;
      false_positive: number;
      pending_enrichment: number;
      judged: number;
      fp_rate_pct: number | null;
      tp_rate_pct: number | null;
    };
    overall_reference: { edu_true: number; edu_false: number; reject_rate_pct: number | null };
    keyword_baseline_reject_pct: number;
  };
  extraction_quality: {
    open_canonicals: number;
    with_institution_pct: number;
    with_date_pct: number;
    with_actor_pct: number;
    edu_confirmed_pct: number;
  };
  samples: {
    false_positives: Array<{ title: string; title_reason: string | null; title_score: number | null; rejected_reason: string | null }>;
    true_positives: Array<{ title: string; title_reason: string | null; institution_name: string | null; incident_date: string | null }>;
  };
}

export async function getV2ClassifierQuality(token: string, sampleLimit = 12): Promise<V2ClassifierQuality> {
  return adminRequest(`/api/admin/v2/classifier-quality?sample_limit=${sampleLimit}`, token);
}

export async function runV2Plan(
  token: string,
  planName: string,
  options: { background?: boolean; include_paid_rss?: boolean } = {},
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ plan_name: planName });
  if (options.background !== undefined) params.set("background", String(options.background));
  if (options.include_paid_rss !== undefined) {
    params.set("include_paid_rss", String(options.include_paid_rss));
  }
  return adminRequest(`/api/admin/v2/run-plan?${params.toString()}`, token, {
    method: "POST",
  });
}

export async function runV2DataQualitySweep(
  token: string,
  limit?: number,
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  return adminRequest(`/api/admin/v2/data-quality/sweep-now${params.toString() ? `?${params.toString()}` : ""}`, token, {
    method: "POST",
  });
}

export async function runV2ConsistencySweep(
  token: string,
  options: { limit?: number; scan_limit?: number } = {},
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.scan_limit) params.set("scan_limit", String(options.scan_limit));
  return adminRequest(
    `/api/admin/v2/canonicalize/consistency-sweep-now${params.toString() ? `?${params.toString()}` : ""}`,
    token,
    { method: "POST" },
  );
}

export async function getV2ManualReviewQueue(
  token: string,
  limit: number = 50,
): Promise<V2ManualReviewQueueResponse> {
  return adminRequest(`/api/admin/v2/manual-review-queue?limit=${limit}`, token);
}

export async function getV2RejectedEnrichments(
  token: string,
  limit: number = 50,
): Promise<V2RejectedEnrichmentsResponse> {
  return adminRequest(`/api/admin/v2/rejected-enrichments?limit=${limit}`, token);
}

export async function getV2ConsistencyCandidates(
  token: string,
  options: { limit?: number; scan_limit?: number } = {},
): Promise<V2ConsistencyCandidatesResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.scan_limit) params.set("scan_limit", String(options.scan_limit));
  const query = params.toString();
  return adminRequest(`/api/admin/v2/canonicalize/consistency-candidates${query ? `?${query}` : ""}`, token);
}
