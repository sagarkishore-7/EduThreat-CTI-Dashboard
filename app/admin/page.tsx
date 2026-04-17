"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LogIn,
  LogOut,
  Database,
  FileDown,
  RefreshCw,
  Shield,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Upload,
  Calendar,
  Play,
  Square,
  Clock,
  Terminal,
  Activity,
  Zap,
  History,
  ChevronDown,
  ChevronUp,
  Radio,
  Power,
  RotateCw,
  Search,
  Eye,
  Copy,
  GitMerge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE, getRawIncidents, RawIncidentFilters } from "@/lib/api";

interface ExportStats {
  total_incidents: number;
  enriched_incidents: number;
  education_related: number;
  total_sources: number;
  db_size_mb: number;
  last_updated: string;
}

interface PipelineProgress {
  step: string;
  detail: string;
  percent: number;
}

interface PipelineRun {
  run_id: string;
  phase: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  progress: PipelineProgress;
  result: Record<string, unknown>;
  error: string | null;
  params: Record<string, unknown>;
}

// ------------------------------------------------------------------
// Phase metadata for UI
// ------------------------------------------------------------------
const PHASE_META: Record<
  string,
  { label: string; description: string; color: string }
> = {
  ingest: {
    label: "Phase 1: Ingestion",
    description: "Scrape all sources (curated, news, RSS, API)",
    color: "from-blue-500 to-cyan-500",
  },
  enrich: {
    label: "Phase 2: Enrichment",
    description: "LLM-powered CTI extraction for unenriched incidents",
    color: "from-purple-500 to-pink-500",
  },
  historical: {
    label: "Historical Collection",
    description: "Full scrape (2019+) then LLM enrichment",
    color: "from-amber-500 to-orange-500",
  },
  daily: {
    label: "Daily Pipeline",
    description: "Incremental ingest + enrich new incidents",
    color: "from-green-500 to-emerald-500",
  },
  rss: {
    label: "RSS Ingestion",
    description: "Fetch latest RSS feeds only",
    color: "from-sky-500 to-blue-500",
  },
  weekly: {
    label: "Weekly Ingestion",
    description: "Full curated + news sources",
    color: "from-indigo-500 to-violet-500",
  },
  ingest_source: {
    label: "Source Ingestion",
    description: "Ingest a specific source group",
    color: "from-teal-500 to-cyan-500",
  },
};

export default function AdminPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Login form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Export stats
  const [stats, setStats] = useState<ExportStats | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Pipeline state
  const [pipelineStatus, setPipelineStatus] = useState<{
    running: boolean;
    current_run: PipelineRun | null;
  } | null>(null);
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([]);
  const [logOffset, setLogOffset] = useState(0);
  const [runHistory, setRunHistory] = useState<PipelineRun[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showExports, setShowExports] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Incident management state
  const [showIncidents, setShowIncidents] = useState(false);
  const [unenrichedIncidents, setUnenrichedIncidents] = useState<any[]>([]);
  const [enrichedIncidents, setEnrichedIncidents] = useState<any[]>([]);
  const [unenrichedTotal, setUnenrichedTotal] = useState(0);
  const [enrichedTotal, setEnrichedTotal] = useState(0);
  const [unenrichedPage, setUnenrichedPage] = useState(1);
  const [enrichedPage, setEnrichedPage] = useState(1);
  const [selectedUnenriched, setSelectedUnenriched] = useState<Set<string>>(new Set());
  const [selectedEnriched, setSelectedEnriched] = useState<Set<string>>(new Set());
  const [incidentSearch, setIncidentSearch] = useState("");
  const [incidentTab, setIncidentTab] = useState<"unenriched" | "enriched">("unenriched");
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [deletingIncidents, setDeletingIncidents] = useState(false);

  // Scheduler state
  const [schedulerStatus, setSchedulerStatus] = useState<{
    running: boolean;
    started_at: string | null;
    last_runs: Record<string, string | null>;
    total_new_incidents: number;
    jobs: { interval: string; unit: string; next_run: string | null }[];
  } | null>(null);
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  const schedulerPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Re-enrich state
  const [reEnrichDate, setReEnrichDate] = useState("");
  const [reEnrichLoading, setReEnrichLoading] = useState(false);
  const [reEnrichResult, setReEnrichResult] = useState<{ reverted_count: number; before_date: string } | null>(null);

  // Phantom enrichment reset state
  const [phantomResetLoading, setPhantomResetLoading] = useState(false);
  const [phantomResetResult, setPhantomResetResult] = useState<{ reset_count: number } | null>(null);

  // Deduplication state
  const [dedupWindowDays, setDedupWindowDays] = useState(14);
  const [dedupLoading, setDedupLoading] = useState(false);
  const [dedupResult, setDedupResult] = useState<{
    groups_merged: number;
    incidents_removed: number;
    date_window_days: number;
    dry_run: boolean;
    groups_found?: number;
    incidents_to_remove?: number;
    preview?: { keep: string; keep_name: string; keep_date: string; merge_count: number; duplicates: { id: string; date: string }[] }[];
  } | null>(null);

  // Purge non-education state
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{ non_education_purged: number; orphan_purged: number; total_purged: number } | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [diagResult, setDiagResult] = useState<Record<string, any> | null>(null);

  // ------------------------------------------------------------------
  // Auth helpers
  // ------------------------------------------------------------------

  useEffect(() => {
    const token = localStorage.getItem("admin_session_token");
    if (token) {
      setSessionToken(token);
      setIsLoggedIn(true);
      fetchStats(token);
      fetchPipelineStatus(token);
      fetchRunHistory(token);
      fetchSchedulerStatus(token);
    }
  }, []);

  const authHeaders = useCallback(
    () =>
      sessionToken
        ? { "X-Session-Token": sessionToken }
        : ({} as Record<string, string>),
    [sessionToken]
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSessionToken(data.session_token);
        setIsLoggedIn(true);
        localStorage.setItem("admin_session_token", data.session_token);
        setSuccess("Login successful!");
        fetchStats(data.session_token);
        fetchPipelineStatus(data.session_token);
        fetchRunHistory(data.session_token);
      } else {
        setError(data.detail || "Login failed");
      }
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (sessionToken) {
      try {
        await fetch(`${API_BASE}/api/admin/logout`, {
          method: "POST",
          headers: { "X-Session-Token": sessionToken },
        });
      } catch {}
    }
    localStorage.removeItem("admin_session_token");
    setSessionToken(null);
    setIsLoggedIn(false);
    setStats(null);
    setPipelineStatus(null);
    stopPolling();
    setSuccess("Logged out successfully");
  };

  // ------------------------------------------------------------------
  // Data fetchers
  // ------------------------------------------------------------------

  const fetchStats = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/export/stats`, {
        headers: { "X-Session-Token": token },
      });
      if (res.ok) setStats(await res.json());
      else if (res.status === 401) {
        handleLogout();
        setError("Session expired.");
      }
    } catch {}
  };

  const fetchPipelineStatus = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/pipeline/status`, {
        headers: { "X-Session-Token": token },
      });
      if (res.ok) {
        const data = await res.json();
        setPipelineStatus(data);
        return data;
      }
    } catch {}
    return null;
  };

  const fetchPipelineLogs = async (
    token: string,
    runId?: string,
    offset = 0
  ) => {
    try {
      const params = new URLSearchParams();
      if (runId) params.set("run_id", runId);
      params.set("offset", String(offset));
      params.set("limit", "500");
      const res = await fetch(
        `${API_BASE}/api/admin/pipeline/logs?${params}`,
        { headers: { "X-Session-Token": token } }
      );
      if (res.ok) {
        const data = await res.json();
        if (offset === 0) {
          setPipelineLogs(data.logs);
        } else {
          setPipelineLogs((prev) => [...prev, ...data.logs]);
        }
        setLogOffset(data.offset + data.logs.length);
        return data;
      }
    } catch {}
    return null;
  };

  const fetchRunHistory = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/pipeline/history?limit=20`, {
        headers: { "X-Session-Token": token },
      });
      if (res.ok) {
        const data = await res.json();
        setRunHistory(data.runs || []);
      }
    } catch {}
  };

  // ------------------------------------------------------------------
  // Polling for live updates
  // ------------------------------------------------------------------

  const startPolling = useCallback(
    (runId?: string) => {
      stopPolling();
      setShowLogs(true);
      setPipelineLogs([]);
      setLogOffset(0);

      pollRef.current = setInterval(async () => {
        if (!sessionToken) return;
        const statusData = await fetchPipelineStatus(sessionToken);
        await fetchPipelineLogs(sessionToken, runId, logOffset);

        // Auto-scroll logs
        if (logContainerRef.current) {
          logContainerRef.current.scrollTop =
            logContainerRef.current.scrollHeight;
        }

        // Stop polling when run is done
        if (
          statusData &&
          !statusData.running &&
          statusData.current_run?.status !== "running"
        ) {
          stopPolling();
          fetchStats(sessionToken);
          fetchRunHistory(sessionToken);
        }
      }, 10000);
    },
    [sessionToken, logOffset]
  );

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  // Resume polling if pipeline is already running on mount
  useEffect(() => {
    if (pipelineStatus?.running && !pollRef.current && sessionToken) {
      startPolling(pipelineStatus.current_run?.run_id);
    }
  }, [pipelineStatus?.running]);

  // ------------------------------------------------------------------
  // Pipeline actions
  // ------------------------------------------------------------------

  const startPipeline = async (phase: string, params?: Record<string, unknown>) => {
    if (!sessionToken) return;
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/admin/pipeline/start`, {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phase, params: params || {} }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(`Pipeline "${PHASE_META[phase]?.label || phase}" started!`);
        fetchPipelineStatus(sessionToken);
        startPolling(data.run_id);
      } else if (res.status === 409) {
        setError(
          typeof data.detail === "string"
            ? data.detail
            : data.detail?.message || "Pipeline already running"
        );
      } else {
        setError(data.detail || "Failed to start pipeline");
      }
    } catch {
      setError("Failed to start pipeline");
    }
  };

  const stopPipeline = async () => {
    if (!sessionToken) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/pipeline/stop`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) setSuccess("Cancel requested. Pipeline will stop at next checkpoint.");
      else setError(data.detail || "Failed to stop pipeline");
    } catch {
      setError("Failed to stop pipeline");
    }
  };

  const downloadFile = async (endpoint: string, filename: string, type: string) => {
    if (!sessionToken) return;
    setDownloading(type);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin${endpoint}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSuccess(`Downloaded ${filename}`);
      } else if (res.status === 401) {
        handleLogout();
        setError("Session expired.");
      } else {
        setError("Download failed");
      }
    } catch {
      setError("Download failed");
    } finally {
      setDownloading(null);
    }
  };

  const triggerJob = async (jobType: string) => {
    if (!sessionToken) return;
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/scheduler/trigger/${jobType}`,
        { method: "POST", headers: authHeaders() }
      );
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Job ${jobType} started in background`);
        if (data.run_id) startPolling(data.run_id);
        fetchPipelineStatus(sessionToken);
      } else {
        setError(data.detail || `Failed to trigger ${jobType}`);
      }
    } catch {
      setError("Failed to trigger job");
    }
  };

  // ------------------------------------------------------------------
  // Scheduler helpers
  // ------------------------------------------------------------------

  const fetchSchedulerStatus = async (token?: string) => {
    const t = token || sessionToken;
    if (!t) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/scheduler/status`, {
        headers: { "X-Session-Token": t },
      });
      if (res.ok) {
        const data = await res.json();
        setSchedulerStatus(data);
        // Start/stop polling based on scheduler state
        if (data.running && !schedulerPollRef.current) {
          schedulerPollRef.current = setInterval(() => fetchSchedulerStatus(t), 30000);
        } else if (!data.running && schedulerPollRef.current) {
          clearInterval(schedulerPollRef.current);
          schedulerPollRef.current = null;
        }
      }
    } catch {
      // silent
    }
  };

  const startScheduler = async () => {
    if (!sessionToken) return;
    setSchedulerLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/scheduler/start`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Real-time intelligence pipeline started!");
        fetchSchedulerStatus(sessionToken);
        // Also refresh pipeline status since catch-up may start running
        setTimeout(() => fetchPipelineStatus(sessionToken), 2000);
      } else {
        setError(typeof data.detail === "string" ? data.detail : "Failed to start scheduler");
      }
    } catch {
      setError("Failed to start scheduler");
    } finally {
      setSchedulerLoading(false);
    }
  };

  const stopScheduler = async () => {
    if (!sessionToken) return;
    setSchedulerLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/scheduler/stop`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Scheduler stopped");
        fetchSchedulerStatus(sessionToken);
      } else {
        setError(typeof data.detail === "string" ? data.detail : "Failed to stop scheduler");
      }
    } catch {
      setError("Failed to stop scheduler");
    } finally {
      setSchedulerLoading(false);
    }
  };

  // Clean up scheduler polling on unmount
  useEffect(() => {
    return () => {
      if (schedulerPollRef.current) clearInterval(schedulerPollRef.current);
    };
  }, []);

  // ------------------------------------------------------------------
  // Re-enrich helpers
  // ------------------------------------------------------------------

  const handleReEnrich = async () => {
    if (!sessionToken || !reEnrichDate) return;
    setReEnrichLoading(true);
    setError(null);
    setReEnrichResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/re-enrich`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ before_date: reEnrichDate }),
      });
      const data = await res.json();
      if (res.ok) {
        setReEnrichResult({ reverted_count: data.reverted_count, before_date: data.before_date });
        setSuccess(data.message);
        fetchStats(sessionToken);
      } else {
        setError(typeof data.detail === "string" ? data.detail : "Re-enrichment failed");
      }
    } catch {
      setError("Failed to reset enrichment");
    } finally {
      setReEnrichLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // Deduplication
  // ------------------------------------------------------------------

  const handleDedup = async (dryRun: boolean) => {
    if (!sessionToken) return;
    if (!dryRun && !confirm(`This will permanently merge duplicate incidents within a ${dedupWindowDays}-day window. Continue?`)) return;
    setDedupLoading(true);
    setError(null);
    setDedupResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/deduplicate`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ date_window_days: dedupWindowDays, name_threshold: 85, dry_run: dryRun }),
      });
      const data = await res.json();
      if (res.ok) {
        setDedupResult(data);
        if (!dryRun) {
          setSuccess(`Merged ${data.groups_merged} duplicate groups, removed ${data.incidents_removed} incidents.`);
          fetchStats(sessionToken);
        }
      } else {
        setError(typeof data.detail === "string" ? data.detail : "Deduplication failed");
      }
    } catch {
      setError("Deduplication request failed");
    } finally {
      setDedupLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // Phantom enrichment reset
  // ------------------------------------------------------------------

  const handlePhantomReset = async () => {
    if (!sessionToken) return;
    if (!confirm("Reset all phantom enriched incidents (marked enriched but with no LLM data)? They will be re-fetched and re-enriched on the next pipeline run.")) return;
    setPhantomResetLoading(true);
    setError(null);
    setPhantomResetResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/reset-phantom-enrichments`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setPhantomResetResult({ reset_count: data.reset_count });
        setSuccess(data.message);
        fetchStats(sessionToken);
      } else {
        setError(typeof data.detail === "string" ? data.detail : "Phantom reset failed");
      }
    } catch {
      setError("Failed to reset phantom enrichments");
    } finally {
      setPhantomResetLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // Purge non-education incidents
  // ------------------------------------------------------------------

  const handlePurgeNonEducation = async () => {
    if (!sessionToken) return;
    if (!confirm("This will permanently DELETE all incidents that the LLM classified as not education-related. This cannot be undone. Continue?")) return;
    setPurgeLoading(true);
    setError(null);
    setPurgeResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/purge-non-education`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setPurgeResult({ non_education_purged: data.non_education_purged, orphan_purged: data.orphan_purged, total_purged: data.total_purged });
        setSuccess(data.message);
        fetchStats(sessionToken);
      } else {
        setError(typeof data.detail === "string" ? data.detail : "Purge failed");
      }
    } catch {
      setError("Failed to purge non-education incidents");
    } finally {
      setPurgeLoading(false);
    }
  };

  // Diagnostic preview for purge
  const handleDiagnosticPreview = async () => {
    if (!sessionToken) return;
    setDiagLoading(true);
    setDiagResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/purge-non-education/preview`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setDiagResult(data);
      } else {
        setError(typeof data.detail === "string" ? data.detail : "Diagnostic failed");
      }
    } catch {
      setError("Failed to fetch diagnostic data");
    } finally {
      setDiagLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // Legacy helpers (downloads, maintenance)
  // ------------------------------------------------------------------

  const migrateDatabase = async () => {
    if (!sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/migrate-db`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Database migrated! ${data.incident_count} incidents at ${data.destination}`);
        fetchStats(sessionToken);
      } else setError(data.message || "Migration failed");
    } catch {
      setError("Migration failed");
    } finally {
      setLoading(false);
    }
  };

  const uploadDatabase = async (file: File) => {
    if (!sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/api/admin/upload-database`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(
          `Uploaded! ${data.incident_count} incidents, ${data.enriched_count} enriched, ${data.db_size_mb} MB`
        );
        fetchStats(sessionToken);
      } else setError(data.detail || "Upload failed");
    } catch {
      setError("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const fixIncidentDates = async (apply: boolean) => {
    if (!sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/fix-incident-dates?apply=${apply}`,
        { method: "POST", headers: authHeaders() }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(
          apply
            ? `Fixed ${data.fixed} incident dates! ${data.skipped} skipped.`
            : `Dry run: Would fix ${data.fixed} dates. ${data.skipped} skipped.`
        );
        if (apply) fetchStats(sessionToken);
      } else setError(data.detail || "Fix failed");
    } catch {
      setError("Fix failed");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // Incident management
  // ------------------------------------------------------------------

  const fetchIncidents = async (type: "unenriched" | "enriched", page = 1, search = "") => {
    if (!sessionToken) return;
    setLoadingIncidents(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "50" });
      if (search) params.set("search", search);
      const res = await fetch(
        `${API_BASE}/api/admin/incidents/${type}?${params}`,
        { headers: { "X-Session-Token": sessionToken } }
      );
      if (res.ok) {
        const data = await res.json();
        if (type === "unenriched") {
          setUnenrichedIncidents(data.incidents);
          setUnenrichedTotal(data.total);
          setUnenrichedPage(data.page);
        } else {
          setEnrichedIncidents(data.incidents);
          setEnrichedTotal(data.total);
          setEnrichedPage(data.page);
        }
      }
    } catch {
      setError(`Failed to fetch ${type} incidents`);
    } finally {
      setLoadingIncidents(false);
    }
  };

  const deleteSelectedIncidents = async () => {
    if (!sessionToken) return;
    const selected = incidentTab === "unenriched" ? selectedUnenriched : selectedEnriched;
    if (selected.size === 0) return;

    if (!confirm(`Delete ${selected.size} incident(s)? This cannot be undone.`)) return;

    setDeletingIncidents(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/incidents/delete`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ incident_ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message);
        if (incidentTab === "unenriched") {
          setSelectedUnenriched(new Set());
          fetchIncidents("unenriched", unenrichedPage, incidentSearch);
        } else {
          setSelectedEnriched(new Set());
          fetchIncidents("enriched", enrichedPage, incidentSearch);
        }
        if (sessionToken) fetchStats(sessionToken);
      } else {
        setError(data.detail || "Delete failed");
      }
    } catch {
      setError("Delete failed");
    } finally {
      setDeletingIncidents(false);
    }
  };

  const clearAllIncidents = async () => {
    if (!sessionToken) return;
    if (!confirm("⚠️ DELETE ALL INCIDENTS? This will completely empty the database. This cannot be undone!")) return;
    if (!confirm("Are you absolutely sure? Type OK in the next prompt to confirm.")) return;

    setDeletingIncidents(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/incidents/clear-all`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(data.message);
        setUnenrichedIncidents([]);
        setEnrichedIncidents([]);
        setUnenrichedTotal(0);
        setEnrichedTotal(0);
        setSelectedUnenriched(new Set());
        setSelectedEnriched(new Set());
        if (sessionToken) fetchStats(sessionToken);
      } else {
        setError(data.detail || "Clear failed");
      }
    } catch {
      setError("Clear all failed");
    } finally {
      setDeletingIncidents(false);
    }
  };

  const toggleSelectAll = (type: "unenriched" | "enriched") => {
    const incidents = type === "unenriched" ? unenrichedIncidents : enrichedIncidents;
    const selected = type === "unenriched" ? selectedUnenriched : selectedEnriched;
    const setSelected = type === "unenriched" ? setSelectedUnenriched : setSelectedEnriched;

    if (selected.size === incidents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(incidents.map((i: any) => i.incident_id)));
    }
  };

  const toggleSelect = (id: string, type: "unenriched" | "enriched") => {
    const selected = type === "unenriched" ? selectedUnenriched : selectedEnriched;
    const setSelected = type === "unenriched" ? setSelectedUnenriched : setSelectedEnriched;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  // Clear messages after 8 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // ------------------------------------------------------------------
  // Login screen
  // ------------------------------------------------------------------

  if (!isLoggedIn) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-xl p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center mb-2">Admin Login</h1>
            <p className="text-muted-foreground text-center mb-6">
              Pipeline control, exports, and system management
            </p>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:border-primary"
                  placeholder="admin"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:border-primary"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors",
                  "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Main admin dashboard
  // ------------------------------------------------------------------

  const isRunning = pipelineStatus?.running ?? false;
  const currentRun = pipelineStatus?.current_run;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Shield className="w-7 h-7 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Pipeline control, live logs, exports, and system management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (sessionToken) {
                fetchStats(sessionToken);
                fetchPipelineStatus(sessionToken);
                fetchRunHistory(sessionToken);
              }
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2 text-green-400">
          <Check className="w-5 h-5 flex-shrink-0" />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total Incidents" value={stats.total_incidents} />
          <StatCard label="Enriched" value={stats.enriched_incidents} />
          <StatCard label="Education Related" value={stats.education_related} />
          <StatCard label="Total Sources" value={stats.total_sources} />
          <StatCard label="DB Size" value={`${stats.db_size_mb} MB`} />
          <StatCard
            label="Last Updated"
            value={new Date(stats.last_updated).toLocaleDateString()}
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* PIPELINE CONTROL CENTER */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Pipeline Control Center
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          Start pipeline phases, monitor progress, and view live logs.
          Only one pipeline can run at a time.
        </p>

        {/* Current Run Status Banner */}
        {currentRun && (
          <div
            className={cn(
              "mb-5 p-4 rounded-lg border",
              currentRun.status === "running"
                ? "bg-blue-500/10 border-blue-500/30"
                : currentRun.status === "completed"
                ? "bg-green-500/10 border-green-500/30"
                : currentRun.status === "failed"
                ? "bg-red-500/10 border-red-500/30"
                : "bg-yellow-500/10 border-yellow-500/30"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                {currentRun.status === "running" && (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                )}
                {currentRun.status === "completed" && (
                  <Check className="w-5 h-5 text-green-400" />
                )}
                {currentRun.status === "failed" && (
                  <X className="w-5 h-5 text-red-400" />
                )}
                <div>
                  <span className="font-medium">
                    {PHASE_META[currentRun.phase]?.label || currentRun.phase}
                  </span>
                  <span className="text-xs text-muted-foreground ml-3">
                    {currentRun.run_id}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {currentRun.status === "running" && (
                  <button
                    onClick={stopPipeline}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm transition-colors"
                  >
                    <Square className="w-3.5 h-3.5" />
                    Stop
                  </button>
                )}
                <StatusBadge status={currentRun.status} />
              </div>
            </div>

            {/* Progress bar */}
            {currentRun.status === "running" && currentRun.progress && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>
                    {currentRun.progress.step}
                    {currentRun.progress.detail
                      ? ` - ${currentRun.progress.detail}`
                      : ""}
                  </span>
                  <span>{currentRun.progress.percent}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${currentRun.progress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Duration / error */}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {currentRun.started_at && (
                <span>
                  Started: {new Date(currentRun.started_at).toLocaleTimeString()}
                </span>
              )}
              {currentRun.duration_seconds != null && (
                <span>Duration: {formatDuration(currentRun.duration_seconds)}</span>
              )}
              {currentRun.error && (
                <span className="text-red-400 truncate max-w-md">
                  Error: {currentRun.error}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Phase buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PhaseButton
            phase="daily"
            disabled={isRunning}
            onClick={() => startPipeline("daily")}
          />
          <PhaseButton
            phase="ingest"
            disabled={isRunning}
            onClick={() => startPipeline("ingest")}
          />
          <PhaseButton
            phase="enrich"
            disabled={isRunning}
            onClick={() => startPipeline("enrich")}
          />
          <PhaseButton
            phase="historical"
            disabled={isRunning}
            onClick={() => startPipeline("historical")}
          />
        </div>

        {/* Secondary phase buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <PhaseButton
            phase="rss"
            disabled={isRunning}
            onClick={() => startPipeline("rss")}
            small
          />
          <PhaseButton
            phase="weekly"
            disabled={isRunning}
            onClick={() => startPipeline("weekly")}
            small
          />
          <PhaseButton
            phase="ingest_source"
            disabled={isRunning}
            onClick={() =>
              startPipeline("ingest_source", { group: "curated" })
            }
            small
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* REAL-TIME INTELLIGENCE PIPELINE (SCHEDULER) */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Radio className="w-5 h-5 text-primary" />
              Real-Time Intelligence Pipeline
              {schedulerStatus?.running && (
                <span className="ml-2 flex items-center gap-1.5 text-xs font-medium text-green-400">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Active
                </span>
              )}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Continuous automated collection: RSS every 1h, API sources every 6h, full pipeline daily.
            </p>
          </div>

          <button
            onClick={schedulerStatus?.running ? stopScheduler : startScheduler}
            disabled={schedulerLoading}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              schedulerStatus?.running
                ? "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
                : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/20",
              schedulerLoading && "opacity-60 cursor-not-allowed"
            )}
          >
            {schedulerLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : schedulerStatus?.running ? (
              <Power className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {schedulerStatus?.running ? "Stop Scheduler" : "Start Cron Job"}
          </button>
        </div>

        {/* Scheduler details when running */}
        {schedulerStatus?.running && (
          <div className="mt-4 space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Started</div>
                <div className="text-sm font-medium mt-1">
                  {schedulerStatus.started_at
                    ? new Date(schedulerStatus.started_at).toLocaleTimeString()
                    : "—"}
                </div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">New Incidents</div>
                <div className="text-sm font-medium mt-1 text-green-400">
                  {schedulerStatus.total_new_incidents}
                </div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Scheduled Jobs</div>
                <div className="text-sm font-medium mt-1">
                  {schedulerStatus.jobs.length}
                </div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Next Run</div>
                <div className="text-sm font-medium mt-1">
                  {schedulerStatus.jobs.length > 0 && schedulerStatus.jobs[0].next_run
                    ? new Date(schedulerStatus.jobs[0].next_run).toLocaleTimeString()
                    : "—"}
                </div>
              </div>
            </div>

            {/* Job schedule table */}
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Job</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Interval</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Last Run</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Next Run</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: "rss", label: "RSS Feeds", interval: "Every 1 hour" },
                    { key: "api", label: "API Sources", interval: "Every 6 hours" },
                    { key: "daily", label: "Full Pipeline", interval: "Every 24 hours" },
                  ].map((job) => (
                    <tr key={job.key} className="border-t border-border">
                      <td className="px-4 py-2.5 font-medium">{job.label}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{job.interval}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {schedulerStatus.last_runs[job.key]
                          ? new Date(schedulerStatus.last_runs[job.key]!).toLocaleTimeString()
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {schedulerStatus.jobs.find(
                          (j, i) =>
                            (job.key === "rss" && i === 0) ||
                            (job.key === "api" && i === 1) ||
                            (job.key === "daily" && i === 2)
                        )?.next_run
                          ? new Date(
                              schedulerStatus.jobs[
                                job.key === "rss" ? 0 : job.key === "api" ? 1 : 2
                              ]?.next_run || ""
                            ).toLocaleTimeString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info when not running */}
        {!schedulerStatus?.running && (
          <div className="mt-3 p-4 bg-secondary/30 rounded-lg text-sm text-muted-foreground">
            Click <span className="text-foreground font-medium">Start Cron Job</span> to activate continuous intelligence collection.
            The scheduler will run an initial catch-up to fetch recent incidents, then continue monitoring
            sources at regular intervals with automatic LLM enrichment.
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* RE-ENRICH SECTION */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <RotateCw className="w-5 h-5 text-primary" />
          Re-Enrich Incidents
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Reset enrichment for incidents processed before a given date so they can be
          re-enriched with the updated extraction schema.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium mb-1.5">
              Re-enrich incidents enriched before
            </label>
            <input
              type="date"
              value={reEnrichDate}
              onChange={(e) => {
                setReEnrichDate(e.target.value);
                setReEnrichResult(null);
              }}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleReEnrich}
            disabled={!reEnrichDate || reEnrichLoading}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30",
              (!reEnrichDate || reEnrichLoading) && "opacity-50 cursor-not-allowed"
            )}
          >
            {reEnrichLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCw className="w-4 h-4" />
            )}
            Reset &amp; Re-Enrich
          </button>
        </div>

        {reEnrichResult && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
            <span className="font-medium text-amber-400">{reEnrichResult.reverted_count}</span>{" "}
            incident{reEnrichResult.reverted_count !== 1 ? "s" : ""} enriched before{" "}
            <span className="font-medium">{reEnrichResult.before_date}</span> have been reset.
            {reEnrichResult.reverted_count > 0 && (
              <span className="text-muted-foreground">
                {" "}Run the <span className="text-foreground">Enrichment</span> phase to re-process them.
              </span>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* DEDUPLICATE INCIDENTS */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <GitMerge className="w-5 h-5 text-blue-400" />
          Deduplicate Incidents
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Merge incidents from different sources that describe the same attack on the same victim.
          Two incidents are merged if their victim names match (fuzzy) and their dates are within
          the window. Dates more than the window apart are kept as separate re-attacks.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-4">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium mb-1.5">
              Date window (days)
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={dedupWindowDays}
              onChange={(e) => { setDedupWindowDays(Number(e.target.value)); setDedupResult(null); }}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleDedup(true)}
              disabled={dedupLoading}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30",
                dedupLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              {dedupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Preview
            </button>
            <button
              onClick={() => handleDedup(false)}
              disabled={dedupLoading}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30",
                dedupLoading && "opacity-50 cursor-not-allowed"
              )}
            >
              {dedupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
              Merge Duplicates
            </button>
          </div>
        </div>

        {dedupResult && (
          <div className="mt-2 space-y-3">
            {dedupResult.dry_run ? (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
                <p className="font-medium text-blue-400 mb-1">
                  Preview: {dedupResult.groups_found} duplicate groups found,{" "}
                  {dedupResult.incidents_to_remove} incidents would be removed
                </p>
                {dedupResult.preview && dedupResult.preview.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto text-xs text-muted-foreground">
                    {dedupResult.preview.map((g, i) => (
                      <div key={i} className="border-b border-border pb-1">
                        <span className="text-foreground font-medium">{g.keep_name}</span>
                        {" "}({g.keep_date}) ← merging {g.merge_count} duplicate{g.merge_count !== 1 ? "s" : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
                <span className="font-medium text-blue-400">{dedupResult.groups_merged}</span> duplicate groups merged,{" "}
                <span className="font-medium text-blue-400">{dedupResult.incidents_removed}</span> incidents removed
                {" "}(window: {dedupResult.date_window_days} days)
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* RESET PHANTOM ENRICHMENTS */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          Reset Phantom Enrichments
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Find and reset incidents that are marked as enriched but have no actual LLM data
          (e.g. article fetch failed silently). They will be re-fetched and re-enriched on the next pipeline run.
        </p>

        <button
          onClick={handlePhantomReset}
          disabled={phantomResetLoading}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
            "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30",
            phantomResetLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          {phantomResetLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          Reset Phantom Enrichments
        </button>

        {phantomResetResult && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm">
            {phantomResetResult.reset_count > 0 ? (
              <>
                <span className="font-medium text-red-400">{phantomResetResult.reset_count}</span>{" "}
                phantom enriched incident{phantomResetResult.reset_count !== 1 ? "s" : ""} have been reset.
                <span className="text-muted-foreground">
                  {" "}Run the <span className="text-foreground">Enrichment</span> phase to re-process them.
                </span>
              </>
            ) : (
              <span className="text-green-400">No phantom enrichments found — all enriched incidents have valid LLM data.</span>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* PURGE NON-EDUCATION INCIDENTS */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-orange-400" />
          Purge Non-Education Incidents
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete all incidents that the LLM classified as not related to cyberattacks
          on educational institutions. These were collected by broad news scrapers and waste storage and query time.
        </p>

        <div className="flex gap-3 mb-4">
          <button
            onClick={handleDiagnosticPreview}
            disabled={diagLoading}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30",
              diagLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            {diagLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            Diagnostic Preview
          </button>

          <button
            onClick={handlePurgeNonEducation}
            disabled={purgeLoading}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              "bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30",
              purgeLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            {purgeLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
            Purge Non-Education Incidents
          </button>
        </div>

        {diagResult && (
          <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm font-mono space-y-2">
            <h3 className="font-semibold text-blue-400 mb-2">DB Diagnostic</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <span className="text-muted-foreground">Incidents total:</span>
              <span>{diagResult.incidents_total}</span>
              <span className="text-muted-foreground">Incidents enriched:</span>
              <span>{diagResult.incidents_enriched}</span>
              <span className="text-muted-foreground">Incidents unenriched:</span>
              <span>{diagResult.incidents_unenriched}</span>
              <span className="text-muted-foreground">With LLM summary:</span>
              <span>{diagResult.incidents_with_llm_summary}</span>
              <span className="text-muted-foreground">Without LLM summary:</span>
              <span>{diagResult.incidents_without_llm_summary}</span>
            </div>
            <hr className="border-border my-2" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <span className="text-muted-foreground">Enrichments flat total:</span>
              <span>{diagResult.enrichments_flat_total}</span>
              <span className="text-muted-foreground">is_education_related = 1:</span>
              <span className="text-green-400">{diagResult.enrichments_flat_edu_1}</span>
              <span className="text-muted-foreground">is_education_related = 0:</span>
              <span className="text-red-400">{diagResult.enrichments_flat_edu_0}</span>
              <span className="text-muted-foreground">is_education_related = NULL:</span>
              <span className="text-yellow-400">{diagResult.enrichments_flat_edu_null}</span>
            </div>
            <hr className="border-border my-2" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <span className="text-muted-foreground">Orphan enriched:</span>
              <span>{diagResult.orphan_enriched}</span>
              <span className="text-muted-foreground">Articles total:</span>
              <span>{diagResult.articles_total}</span>
              <span className="text-muted-foreground">Articles successful:</span>
              <span>{diagResult.articles_successful}</span>
              <span className="text-muted-foreground">Articles failed:</span>
              <span>{diagResult.articles_failed}</span>
            </div>
            {diagResult.non_edu_samples?.length > 0 && (
              <>
                <hr className="border-border my-2" />
                <div>
                  <span className="text-muted-foreground">Non-edu samples:</span>
                  <pre className="mt-1 text-xs overflow-x-auto">{JSON.stringify(diagResult.non_edu_samples, null, 2)}</pre>
                </div>
              </>
            )}
            {diagResult.orphan_samples?.length > 0 && (
              <>
                <hr className="border-border my-2" />
                <div>
                  <span className="text-muted-foreground">Orphan samples:</span>
                  <pre className="mt-1 text-xs overflow-x-auto">{JSON.stringify(diagResult.orphan_samples, null, 2)}</pre>
                </div>
              </>
            )}
          </div>
        )}

        {purgeResult && (
          <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-sm">
            {purgeResult.total_purged > 0 ? (
              <>
                Purged <span className="font-medium text-orange-400">{purgeResult.total_purged}</span> incidents
                {purgeResult.non_education_purged > 0 && (
                  <> ({purgeResult.non_education_purged} non-education</>
                )}
                {purgeResult.orphan_purged > 0 && (
                  <>, {purgeResult.orphan_purged} orphans</>
                )}
                {(purgeResult.non_education_purged > 0 || purgeResult.orphan_purged > 0) && <>)</>}.
                <span className="text-muted-foreground"> Database cleaned up.</span>
              </>
            ) : (
              <span className="text-green-400">No non-education incidents found — database is clean.</span>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* LIVE LOGS */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => {
            setShowLogs(!showLogs);
            if (!showLogs && sessionToken) {
              fetchPipelineLogs(sessionToken, currentRun?.run_id, 0);
            }
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
        >
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            Pipeline Logs
            {isRunning && (
              <span className="ml-2 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            )}
          </h2>
          {showLogs ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showLogs && (
          <div className="border-t border-border">
            <div
              ref={logContainerRef}
              className="h-80 overflow-y-auto bg-black/30 p-4 font-mono text-xs leading-relaxed"
            >
              {pipelineLogs.length === 0 ? (
                <div className="text-muted-foreground text-center py-10">
                  {isRunning
                    ? "Waiting for logs..."
                    : "No logs available. Start a pipeline phase to see output."}
                </div>
              ) : (
                pipelineLogs.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      "py-0.5",
                      line.includes("[ERROR]")
                        ? "text-red-400"
                        : line.includes("[WARNING]")
                        ? "text-yellow-400"
                        : "text-gray-300"
                    )}
                  >
                    {line}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center justify-between px-4 py-2 bg-secondary/20 text-xs text-muted-foreground">
              <span>{pipelineLogs.length} log lines</span>
              <button
                onClick={() => {
                  if (sessionToken)
                    fetchPipelineLogs(
                      sessionToken,
                      currentRun?.run_id,
                      0
                    );
                }}
                className="hover:text-foreground transition-colors"
              >
                Refresh logs
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* RUN HISTORY */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => {
            setShowHistory(!showHistory);
            if (!showHistory && sessionToken) fetchRunHistory(sessionToken);
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
        >
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Run History
            {runHistory.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({runHistory.length} runs)
              </span>
            )}
          </h2>
          {showHistory ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showHistory && (
          <div className="border-t border-border">
            {runHistory.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No pipeline runs yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {runHistory.map((run) => (
                  <div
                    key={run.run_id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <StatusBadge status={run.status} />
                      <div>
                        <span className="font-medium text-sm">
                          {PHASE_META[run.phase]?.label || run.phase}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {run.run_id}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {run.started_at && (
                        <span>{new Date(run.started_at).toLocaleString()}</span>
                      )}
                      {run.duration_seconds != null && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(run.duration_seconds)}
                        </span>
                      )}
                      <button
                        onClick={async () => {
                          if (!sessionToken) return;
                          setShowLogs(true);
                          setPipelineLogs([]);
                          setLogOffset(0);
                          await fetchPipelineLogs(sessionToken, run.run_id, 0);
                        }}
                        className="text-primary hover:underline"
                      >
                        View Logs
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* SCHEDULER QUICK ACTIONS */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <JobButton
            label="RSS Ingestion"
            description="Fetch latest RSS feeds"
            loading={isRunning}
            onClick={() => triggerJob("rss")}
          />
          <JobButton
            label="Weekly Ingestion"
            description="Full curated + news"
            loading={isRunning}
            onClick={() => triggerJob("weekly")}
          />
          <JobButton
            label="LLM Enrichment"
            description="Enrich unenriched incidents"
            loading={isRunning}
            onClick={() => triggerJob("enrich")}
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* EXPORTS (Collapsible) */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowExports(!showExports)}
          className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
        >
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileDown className="w-5 h-5 text-primary" />
            Data Export & Database Management
          </h2>
          {showExports ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showExports && (
          <div className="border-t border-border p-6 space-y-6">
            {/* Database Export */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                Database Export
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ExportButton
                  label="Full Database (SQLite)"
                  description="Download .db file"
                  icon={Database}
                  loading={downloading === "db"}
                  onClick={() =>
                    downloadFile("/export/database", `eduthreat_${Date.now()}.db`, "db")
                  }
                />
                <ExportButton
                  label="Database as CSV"
                  description="All incidents as CSV"
                  icon={FileDown}
                  loading={downloading === "csv-db"}
                  onClick={() =>
                    downloadFile(
                      "/export/csv/full?education_only=false",
                      `eduthreat_database_${Date.now()}.csv`,
                      "csv-db"
                    )
                  }
                />
              </div>
            </div>

            {/* CSV Exports */}
            <div>
              <h3 className="font-medium mb-3">Enriched CSV Export</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ExportButton
                  label="Enriched (Education Only)"
                  description="Education-related enriched incidents"
                  icon={FileDown}
                  loading={downloading === "csv-enriched-edu"}
                  onClick={() =>
                    downloadFile(
                      "/export/csv/enriched?education_only=true",
                      `eduthreat_enriched_edu_${Date.now()}.csv`,
                      "csv-enriched-edu"
                    )
                  }
                />
                <ExportButton
                  label="Enriched (All)"
                  description="All enriched incidents"
                  icon={FileDown}
                  loading={downloading === "csv-enriched-all"}
                  onClick={() =>
                    downloadFile(
                      "/export/csv/enriched?education_only=false",
                      `eduthreat_enriched_all_${Date.now()}.csv`,
                      "csv-enriched-all"
                    )
                  }
                />
                <ExportButton
                  label="Full CSV (All)"
                  description="All incidents, enriched + unenriched"
                  icon={FileDown}
                  loading={downloading === "csv-full-all"}
                  onClick={() =>
                    downloadFile(
                      "/export/csv/full?education_only=false",
                      `eduthreat_full_all_${Date.now()}.csv`,
                      "csv-full-all"
                    )
                  }
                />
              </div>
            </div>

            {/* Database Management */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-muted-foreground" />
                Database Management
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border rounded-lg p-4 bg-secondary/30">
                  <h4 className="font-medium mb-2 text-sm">Upload Database</h4>
                  <label className="block">
                    <input
                      type="file"
                      accept=".db"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadDatabase(file);
                      }}
                      disabled={loading}
                      className="hidden"
                      id="db-upload"
                    />
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm",
                        "bg-primary/10 hover:bg-primary/20 border border-primary/20",
                        loading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      Choose .db File
                    </span>
                  </label>
                </div>
                <div className="border border-border rounded-lg p-4 bg-secondary/30">
                  <h4 className="font-medium mb-2 text-sm">Migrate from Repo</h4>
                  <button
                    onClick={migrateDatabase}
                    disabled={loading}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors",
                      "bg-secondary hover:bg-secondary/80 border border-border",
                      loading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Migrate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* DATA MAINTENANCE */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Data Maintenance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex gap-3">
            <button
              onClick={() => fixIncidentDates(false)}
              disabled={loading}
              className={cn(
                "flex-1 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors",
                "bg-secondary hover:bg-secondary/80 border border-border",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              <Calendar className="w-4 h-4" />
              Dry Run Dates
            </button>
            <button
              onClick={() => fixIncidentDates(true)}
              disabled={loading}
              className={cn(
                "flex-1 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors",
                "bg-gradient-to-r from-cyan-500 to-purple-600 text-white",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              <Check className="w-4 h-4" />
              Apply Fix
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* INCIDENT MANAGEMENT */}
      {/* ============================================================ */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => {
            setShowIncidents(!showIncidents);
            if (!showIncidents && sessionToken) {
              fetchIncidents("unenriched", 1, "");
              fetchIncidents("enriched", 1, "");
            }
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
        >
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Incident Management
            {(unenrichedTotal > 0 || enrichedTotal > 0) && (
              <span className="text-sm font-normal text-muted-foreground">
                ({unenrichedTotal} unenriched, {enrichedTotal} enriched)
              </span>
            )}
          </h2>
          {showIncidents ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showIncidents && (
          <div className="border-t border-border">
            {/* Tab bar + actions */}
            <div className="flex items-center justify-between px-4 py-3 bg-secondary/20 border-b border-border">
              <div className="flex gap-2">
                <button
                  onClick={() => { setIncidentTab("unenriched"); if (unenrichedIncidents.length === 0 && sessionToken) fetchIncidents("unenriched", 1, incidentSearch); }}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    incidentTab === "unenriched" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  Unenriched ({unenrichedTotal})
                </button>
                <button
                  onClick={() => { setIncidentTab("enriched"); if (enrichedIncidents.length === 0 && sessionToken) fetchIncidents("enriched", 1, incidentSearch); }}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    incidentTab === "enriched" ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  Enriched ({enrichedTotal})
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search incidents..."
                  value={incidentSearch}
                  onChange={(e) => setIncidentSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") fetchIncidents(incidentTab, 1, incidentSearch);
                  }}
                  className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary w-48"
                />
                <button
                  onClick={() => fetchIncidents(incidentTab, 1, incidentSearch)}
                  className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-sm"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-secondary/10 border-b border-border">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleSelectAll(incidentTab)}
                  className="text-xs text-primary hover:underline"
                >
                  {(incidentTab === "unenriched" ? selectedUnenriched : selectedEnriched).size ===
                  (incidentTab === "unenriched" ? unenrichedIncidents : enrichedIncidents).length &&
                  (incidentTab === "unenriched" ? unenrichedIncidents : enrichedIncidents).length > 0
                    ? "Deselect All"
                    : "Select All"}
                </button>
                <span className="text-xs text-muted-foreground">
                  {(incidentTab === "unenriched" ? selectedUnenriched : selectedEnriched).size} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={deleteSelectedIncidents}
                  disabled={
                    deletingIncidents ||
                    (incidentTab === "unenriched" ? selectedUnenriched : selectedEnriched).size === 0
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors",
                    "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30",
                    ((incidentTab === "unenriched" ? selectedUnenriched : selectedEnriched).size === 0 || deletingIncidents) &&
                      "opacity-50 cursor-not-allowed"
                  )}
                >
                  {deletingIncidents ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  Delete Selected
                </button>
                <button
                  onClick={clearAllIncidents}
                  disabled={deletingIncidents}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors",
                    "bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/30",
                    deletingIncidents && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Clear All DB
                </button>
              </div>
            </div>

            {/* Incident table */}
            <div className="overflow-x-auto">
              {loadingIncidents ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading incidents...</span>
                </div>
              ) : (
                <IncidentTable
                  incidents={incidentTab === "unenriched" ? unenrichedIncidents : enrichedIncidents}
                  selected={incidentTab === "unenriched" ? selectedUnenriched : selectedEnriched}
                  onToggle={(id) => toggleSelect(id, incidentTab)}
                  showEnrichmentCols={incidentTab === "enriched"}
                />
              )}
            </div>

            {/* Pagination */}
            {(() => {
              const total = incidentTab === "unenriched" ? unenrichedTotal : enrichedTotal;
              const page = incidentTab === "unenriched" ? unenrichedPage : enrichedPage;
              const totalPages = Math.ceil(total / 50);
              if (totalPages <= 1) return null;
              return (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/10">
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages} ({total} total)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchIncidents(incidentTab, page - 1, incidentSearch)}
                      disabled={page <= 1}
                      className="px-3 py-1 rounded text-sm bg-secondary hover:bg-secondary/80 disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => fetchIncidents(incidentTab, page + 1, incidentSearch)}
                      disabled={page >= totalPages}
                      className="px-3 py-1 rounded text-sm bg-secondary hover:bg-secondary/80 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* RAW DATA VIEWER */}
      {/* ============================================================ */}
      <RawDataViewer />

      {/* Environment Info */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">API:</span>
            <code className="ml-2 text-primary text-xs">{API_BASE}</code>
          </div>
          <div>
            <span className="text-muted-foreground">Session:</span>
            <code className="ml-2 text-green-400">Active</code>
          </div>
          <div>
            <span className="text-muted-foreground">Pipeline:</span>
            <code className={cn("ml-2", isRunning ? "text-blue-400" : "text-muted-foreground")}>
              {isRunning ? "Running" : "Idle"}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Helper Components
// ------------------------------------------------------------------

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
    cancelled: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    interrupted: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    pending: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full text-xs font-medium border",
        colors[status] || colors.pending
      )}
    >
      {status}
    </span>
  );
}

function PhaseButton({
  phase,
  disabled,
  onClick,
  small,
}: {
  phase: string;
  disabled: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  const meta = PHASE_META[phase];
  if (!meta) return null;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg border border-border text-left transition-all",
        small ? "p-3" : "p-4",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-secondary/50 hover:border-primary/30"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={cn("w-2 h-2 rounded-full bg-gradient-to-r", meta.color)} />
        <span className={cn("font-medium", small ? "text-sm" : "")}>{meta.label}</span>
      </div>
      <p className={cn("text-muted-foreground", small ? "text-xs" : "text-sm")}>
        {meta.description}
      </p>
      {!disabled && (
        <div className="flex items-center gap-1 mt-2 text-xs text-primary">
          <Play className="w-3 h-3" />
          Start
        </div>
      )}
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-secondary/50 rounded-lg p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function ExportButton({
  label,
  description,
  icon: Icon,
  loading,
  onClick,
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "p-4 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50",
        "transition-colors text-left",
        loading && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-3 mb-1">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : (
          <Icon className="w-4 h-4 text-primary" />
        )}
        <span className="font-medium text-sm">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function JobButton({
  label,
  description,
  loading,
  onClick,
}: {
  label: string;
  description: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "p-4 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50",
        "transition-colors text-left",
        loading && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-center gap-3 mb-1">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : (
          <Zap className="w-4 h-4 text-primary" />
        )}
        <span className="font-medium text-sm">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

function IncidentTable({
  incidents,
  selected,
  onToggle,
  showEnrichmentCols,
}: {
  incidents: any[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  showEnrichmentCols?: boolean;
}) {
  if (incidents.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No incidents found.
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-secondary/30 text-left">
          <th className="px-3 py-2 w-10">
            <span className="sr-only">Select</span>
          </th>
          <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Institution</th>
          <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Country</th>
          <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Date</th>
          <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Attack Type</th>
          {showEnrichmentCols && (
            <>
              <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Category</th>
              <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Threat Actor</th>
              <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Edu?</th>
            </>
          )}
          <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Sources</th>
          <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Ingested</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {incidents.map((inc) => (
          <tr
            key={inc.incident_id}
            className={cn(
              "hover:bg-secondary/20 transition-colors",
              selected.has(inc.incident_id) && "bg-primary/5"
            )}
          >
            <td className="px-3 py-2">
              <input
                type="checkbox"
                checked={selected.has(inc.incident_id)}
                onChange={() => onToggle(inc.incident_id)}
                className="rounded border-border"
              />
            </td>
            <td className="px-3 py-2 max-w-[200px] truncate" title={inc.title || inc.institution_name}>
              <div className="font-medium text-xs">{inc.institution_name || "Unknown"}</div>
              {inc.title && (
                <div className="text-xs text-muted-foreground truncate">{inc.title}</div>
              )}
            </td>
            <td className="px-3 py-2 text-xs">{inc.country || "-"}</td>
            <td className="px-3 py-2 text-xs whitespace-nowrap">{inc.incident_date || "-"}</td>
            <td className="px-3 py-2 text-xs">{inc.attack_type_hint || "-"}</td>
            {showEnrichmentCols && (
              <>
                <td className="px-3 py-2 text-xs">{inc.attack_category || "-"}</td>
                <td className="px-3 py-2 text-xs">{inc.threat_actor_name || "-"}</td>
                <td className="px-3 py-2 text-xs">
                  {inc.is_education_related === true ? (
                    <span className="text-green-400">Yes</span>
                  ) : inc.is_education_related === false ? (
                    <span className="text-red-400">No</span>
                  ) : (
                    "-"
                  )}
                </td>
              </>
            )}
            <td className="px-3 py-2 text-xs text-muted-foreground max-w-[120px] truncate">
              {inc.sources || "-"}
            </td>
            <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
              {inc.ingested_at ? new Date(inc.ingested_at).toLocaleDateString() : "-"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ------------------------------------------------------------------
// Raw Data Viewer Component
// ------------------------------------------------------------------

function RawDataViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<RawIncidentFilters>({
    limit: 10,
    offset: 0,
  });
  const [incidentIdInput, setIncidentIdInput] = useState("");
  const [attackCategoryInput, setAttackCategoryInput] = useState("");
  const [countryInput, setCountryInput] = useState("");
  const [hasMitre, setHasMitre] = useState<string>("any");
  const [hasEnrichment, setHasEnrichment] = useState<string>("any");
  const [data, setData] = useState<{ total: number; incidents: Record<string, unknown>[] } | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const fetchData = useCallback(async (overrides?: Partial<RawIncidentFilters>) => {
    setLoadingData(true);
    setError(null);
    try {
      const queryFilters: RawIncidentFilters = {
        ...filters,
        ...overrides,
        incident_id: incidentIdInput || undefined,
        attack_category: attackCategoryInput || undefined,
        country: countryInput || undefined,
        has_mitre: hasMitre === "any" ? undefined : hasMitre === "yes",
        has_enrichment: hasEnrichment === "any" ? undefined : hasEnrichment === "yes",
      };
      const result = await getRawIncidents(queryFilters);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoadingData(false);
    }
  }, [filters, incidentIdInput, attackCategoryInput, countryInput, hasMitre, hasEnrichment]);

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, offset: 0 }));
    fetchData({ offset: 0 });
  };

  const handlePageChange = (newOffset: number) => {
    setFilters((prev) => ({ ...prev, offset: newOffset }));
    fetchData({ offset: newOffset });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          Raw Data Viewer
          <span className="text-sm font-normal text-muted-foreground">
            (Debug — inspect DB columns &amp; enrichment JSON)
          </span>
        </h2>
        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {isOpen && (
        <div className="border-t border-border">
          {/* Filters */}
          <div className="p-4 bg-secondary/20 border-b border-border">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Incident ID</label>
                <input
                  type="text"
                  placeholder="Partial match..."
                  value={incidentIdInput}
                  onChange={(e) => setIncidentIdInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Attack Category</label>
                <input
                  type="text"
                  placeholder="e.g. ransomware"
                  value={attackCategoryInput}
                  onChange={(e) => setAttackCategoryInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Country</label>
                <input
                  type="text"
                  placeholder="e.g. United States"
                  value={countryInput}
                  onChange={(e) => setCountryInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Has MITRE</label>
                <select
                  value={hasMitre}
                  onChange={(e) => setHasMitre(e.target.value)}
                  className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                >
                  <option value="any">Any</option>
                  <option value="yes">Yes (has MITRE)</option>
                  <option value="no">No (no MITRE)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Has Enrichment JSON</label>
                <select
                  value={hasEnrichment}
                  onChange={(e) => setHasEnrichment(e.target.value)}
                  className="w-full px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                >
                  <option value="any">Any</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  disabled={loadingData}
                  className={cn(
                    "w-full px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors",
                    "bg-gradient-to-r from-cyan-500 to-purple-600 text-white",
                    loadingData && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {loadingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Fetch
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Results */}
          {data && (
            <div>
              <div className="px-4 py-2 bg-secondary/10 border-b border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Showing {data.incidents.length} of {data.total} results
                  {data.total > 0 && ` (offset ${filters.offset})`}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(Math.max(0, (filters.offset || 0) - (filters.limit || 10)))}
                    disabled={(filters.offset || 0) <= 0}
                    className="px-3 py-1 rounded text-xs bg-secondary hover:bg-secondary/80 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => handlePageChange((filters.offset || 0) + (filters.limit || 10))}
                    disabled={(filters.offset || 0) + (filters.limit || 10) >= data.total}
                    className="px-3 py-1 rounded text-xs bg-secondary hover:bg-secondary/80 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>

              {data.incidents.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No incidents match the filters.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {data.incidents.map((incident, idx) => {
                    const isExpanded = expandedRow === idx;
                    const incidentId = String(incident.incident_id || "");
                    const mitreJson = incident.mitre_techniques_json;
                    const mitreCount = incident.mitre_techniques_count;
                    const enrichmentData = incident.enrichment_data;

                    // Extract key fields for the summary row
                    const keyFields: Record<string, unknown> = {
                      incident_id: incident.incident_id,
                      institution_name: incident.institution_name,
                      country: incident.country,
                      attack_category: incident.attack_category,
                      incident_date: incident.incident_date,
                      mitre_techniques_count: mitreCount,
                      threat_actor_name: incident.threat_actor_name,
                      ransomware_family: incident.ransomware_family,
                    };

                    return (
                      <div key={idx}>
                        {/* Summary row */}
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : idx)}
                          className="w-full text-left px-4 py-3 hover:bg-secondary/20 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-wrap">
                              <span className="text-xs font-mono text-primary truncate max-w-[180px]">
                                {incidentId}
                              </span>
                              <span className="text-sm font-medium truncate max-w-[200px]">
                                {String(incident.institution_name || "Unknown")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {String(incident.country || "-")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {String(incident.attack_category || "-")}
                              </span>
                              {Number(mitreCount) > 0 && (
                                <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">
                                  MITRE: {String(mitreCount)}
                                </span>
                              )}
                              {enrichmentData != null && (
                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                  Has JSON
                                </span>
                              )}
                            </div>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="px-4 pb-4 bg-secondary/10">
                            {/* Section tabs */}
                            <div className="flex gap-2 mb-3 pt-2">
                              {["key_fields", "flat_columns", "mitre_json", "enrichment_json"].map((section) => (
                                <button
                                  key={section}
                                  onClick={() => setExpandedSection(expandedSection === section ? null : section)}
                                  className={cn(
                                    "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                                    expandedSection === section
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
                                  )}
                                >
                                  {section === "key_fields" && "Key Fields"}
                                  {section === "flat_columns" && "All Flat Columns"}
                                  {section === "mitre_json" && `MITRE JSON (${mitreCount || 0})`}
                                  {section === "enrichment_json" && "Enrichment JSON"}
                                </button>
                              ))}
                              <button
                                onClick={() => copyToClipboard(JSON.stringify(incident, null, 2))}
                                className="px-3 py-1 rounded-lg text-xs font-medium bg-secondary hover:bg-secondary/80 text-muted-foreground flex items-center gap-1 ml-auto"
                              >
                                <Copy className="w-3 h-3" />
                                Copy All
                              </button>
                            </div>

                            {/* Key Fields */}
                            {expandedSection === "key_fields" && (
                              <div className="bg-[#0a0a12] rounded-lg p-3 overflow-x-auto">
                                <table className="text-xs w-full">
                                  <tbody>
                                    {Object.entries(keyFields).map(([k, v]) => (
                                      <tr key={k} className="border-b border-border/30">
                                        <td className="py-1.5 pr-4 text-cyan-400 font-mono whitespace-nowrap">{k}</td>
                                        <td className="py-1.5 text-zinc-300 font-mono">
                                          {v === null || v === undefined ? (
                                            <span className="text-red-400/60">NULL</span>
                                          ) : (
                                            String(v)
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* All Flat Columns */}
                            {expandedSection === "flat_columns" && (
                              <div className="bg-[#0a0a12] rounded-lg p-3 overflow-x-auto max-h-[500px] overflow-y-auto">
                                <table className="text-xs w-full">
                                  <tbody>
                                    {Object.entries(incident)
                                      .filter(([k]) => k !== "enrichment_data")
                                      .map(([k, v]) => (
                                        <tr key={k} className="border-b border-border/30">
                                          <td className="py-1.5 pr-4 text-cyan-400 font-mono whitespace-nowrap align-top">
                                            {k}
                                          </td>
                                          <td className="py-1.5 text-zinc-300 font-mono break-all">
                                            {v === null || v === undefined ? (
                                              <span className="text-red-400/60">NULL</span>
                                            ) : typeof v === "object" ? (
                                              <pre className="whitespace-pre-wrap text-xs">
                                                {JSON.stringify(v, null, 2)}
                                              </pre>
                                            ) : (
                                              String(v)
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* MITRE JSON */}
                            {expandedSection === "mitre_json" && (
                              <div className="bg-[#0a0a12] rounded-lg p-3 overflow-x-auto max-h-[500px] overflow-y-auto">
                                {mitreJson ? (
                                  <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap">
                                    {typeof mitreJson === "object"
                                      ? JSON.stringify(mitreJson, null, 2)
                                      : String(mitreJson)}
                                  </pre>
                                ) : (
                                  <p className="text-xs text-red-400/60">
                                    mitre_techniques_json is NULL
                                    {Number(mitreCount) > 0 && (
                                      <span className="text-yellow-400 ml-2">
                                        (but mitre_techniques_count = {String(mitreCount)})
                                      </span>
                                    )}
                                  </p>
                                )}
                                <button
                                  onClick={() => copyToClipboard(
                                    mitreJson
                                      ? typeof mitreJson === "object"
                                        ? JSON.stringify(mitreJson, null, 2)
                                        : String(mitreJson)
                                      : "NULL"
                                  )}
                                  className="mt-2 px-2 py-1 rounded text-xs bg-secondary hover:bg-secondary/80 flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  Copy MITRE JSON
                                </button>
                              </div>
                            )}

                            {/* Enrichment JSON */}
                            {expandedSection === "enrichment_json" && (
                              <div className="bg-[#0a0a12] rounded-lg p-3 overflow-x-auto max-h-[500px] overflow-y-auto">
                                {enrichmentData ? (
                                  <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap">
                                    {typeof enrichmentData === "object"
                                      ? JSON.stringify(enrichmentData, null, 2)
                                      : String(enrichmentData)}
                                  </pre>
                                ) : (
                                  <p className="text-xs text-red-400/60">
                                    enrichment_data is NULL (no JSON enrichment found)
                                  </p>
                                )}
                                <button
                                  onClick={() => copyToClipboard(
                                    enrichmentData
                                      ? typeof enrichmentData === "object"
                                        ? JSON.stringify(enrichmentData, null, 2)
                                        : String(enrichmentData)
                                      : "NULL"
                                  )}
                                  className="mt-2 px-2 py-1 rounded text-xs bg-secondary hover:bg-secondary/80 flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  Copy Enrichment JSON
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom pagination */}
              {data.total > (filters.limit || 10) && (
                <div className="px-4 py-2 bg-secondary/10 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Page {Math.floor((filters.offset || 0) / (filters.limit || 10)) + 1} of{" "}
                    {Math.ceil(data.total / (filters.limit || 10))}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(Math.max(0, (filters.offset || 0) - (filters.limit || 10)))}
                      disabled={(filters.offset || 0) <= 0}
                      className="px-3 py-1 rounded text-xs bg-secondary hover:bg-secondary/80 disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => handlePageChange((filters.offset || 0) + (filters.limit || 10))}
                      disabled={(filters.offset || 0) + (filters.limit || 10) >= data.total}
                      className="px-3 py-1 rounded text-xs bg-secondary hover:bg-secondary/80 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!data && !loadingData && !error && (
            <div className="py-12 text-center text-muted-foreground">
              <Eye className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Set filters and click Fetch to inspect raw incident data</p>
              <p className="text-xs mt-1">
                View all columns from incident_enrichments_flat + full enrichment JSON
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
