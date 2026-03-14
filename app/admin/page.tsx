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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/api";

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
      }, 1500);
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

  // ------------------------------------------------------------------
  // Legacy helpers (downloads, maintenance)
  // ------------------------------------------------------------------

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
          <button
            onClick={async () => {
              if (!sessionToken) return;
              setLoading(true);
              setError(null);
              try {
                const res = await fetch(`${API_BASE}/api/admin/normalize-countries`, {
                  method: "POST",
                  headers: authHeaders(),
                });
                const data = await res.json();
                if (res.ok)
                  setSuccess(data.message || `Normalized ${data.updated || 0} entries`);
                else setError(data.detail || "Failed");
              } catch {
                setError("Failed");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Normalize Countries
          </button>

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
