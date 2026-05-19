"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ADMIN_SESSION_KEY,
  isAdminAuthError,
  getStoredAdminSession,
  getV2ConsistencyCandidates,
  getV2ManualReviewQueue,
  getV2Plans,
  getV2Preflight,
  getV2RuntimeStatus,
  loginV2Admin,
  logoutV2Admin,
  runV2ConsistencySweep,
  runV2DataQualitySweep,
  runV2Plan,
  setStoredAdminSession,
} from "@/lib/admin-api";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  LogIn,
  LogOut,
  Play,
  RefreshCw,
  Shield,
  Sparkles,
  Terminal,
  Workflow,
} from "lucide-react";

type ActionState = {
  type: "success" | "error";
  message: string;
} | null;

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [actionState, setActionState] = useState<ActionState>(null);

  useEffect(() => {
    setToken(getStoredAdminSession());
  }, []);

  const expireSession = (message: string = "Your admin session expired. Please sign in again.") => {
    setToken(null);
    setStoredAdminSession(null);
    queryClient.clear();
    setActionState({ type: "error", message });
  };

  const handleAdminError = (error: Error) => {
    if (isAdminAuthError(error)) {
      expireSession(error.message);
      return;
    }
    setActionState({ type: "error", message: error.message });
  };

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      loginV2Admin(username, password),
    onSuccess: (response) => {
      setToken(response.session_token);
      setStoredAdminSession(response.session_token);
      setPassword("");
      setActionState({ type: "success", message: "Logged into the v2 operations console." });
    },
    onError: (error: Error) => {
      handleAdminError(error);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!token) return;
      await logoutV2Admin(token);
    },
    onSettled: () => {
      setToken(null);
      setStoredAdminSession(null);
      queryClient.clear();
    },
  });

  const preflightQuery = useQuery({
    queryKey: ["admin-v2-preflight", token],
    queryFn: () => getV2Preflight(token!),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  });

  const statusQuery = useQuery({
    queryKey: ["admin-v2-status", token],
    queryFn: () => getV2RuntimeStatus(token!),
    enabled: Boolean(token),
    refetchInterval: 30_000,
  });

  const plansQuery = useQuery({
    queryKey: ["admin-v2-plans", token],
    queryFn: () => getV2Plans(token!),
    enabled: Boolean(token),
  });

  const manualReviewQuery = useQuery({
    queryKey: ["admin-v2-manual-review", token],
    queryFn: () => getV2ManualReviewQueue(token!, 25),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  });

  const consistencyQuery = useQuery({
    queryKey: ["admin-v2-consistency", token],
    queryFn: () => getV2ConsistencyCandidates(token!, { limit: 20, scan_limit: 500 }),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  });

  const preflight = preflightQuery.data;
  const status = statusQuery.data;
  const plans = plansQuery.data;
  const manualReview = manualReviewQuery.data;
  const consistencyCandidates = consistencyQuery.data;
  const refetchPreflight = preflightQuery.refetch;
  const refetchStatus = statusQuery.refetch;
  const refetchPlans = plansQuery.refetch;
  const refetchManualReview = manualReviewQuery.refetch;
  const refetchConsistency = consistencyQuery.refetch;

  useEffect(() => {
    const authError = [
      preflightQuery.error,
      statusQuery.error,
      plansQuery.error,
      manualReviewQuery.error,
      consistencyQuery.error,
    ].find(isAdminAuthError);

    if (token && authError) {
      expireSession(authError.message);
    }
  }, [
    consistencyQuery.error,
    manualReviewQuery.error,
    plansQuery.error,
    preflightQuery.error,
    queryClient,
    statusQuery.error,
    token,
  ]);

  const planMutation = useMutation({
    mutationFn: ({ planName, paid }: { planName: string; paid?: boolean }) =>
      runV2Plan(token!, planName, { background: true, include_paid_rss: paid }),
    onSuccess: (payload) => {
      setActionState({
        type: "success",
        message: `Queued plan successfully: ${JSON.stringify(payload)}`,
      });
      refetchStatus();
    },
    onError: (error: Error) => {
      handleAdminError(error);
    },
  });

  const qualityMutation = useMutation({
    mutationFn: () => runV2DataQualitySweep(token!, 500),
    onSuccess: (payload) => {
      setActionState({
        type: "success",
        message: `Queued data-quality sweep: ${JSON.stringify(payload)}`,
      });
      refetchManualReview();
      refetchStatus();
    },
    onError: (error: Error) => {
      handleAdminError(error);
    },
  });

  const consistencyMutation = useMutation({
    mutationFn: () => runV2ConsistencySweep(token!, { limit: 100, scan_limit: 1000 }),
    onSuccess: (payload) => {
      setActionState({
        type: "success",
        message: `Queued canonical consistency sweep: ${JSON.stringify(payload)}`,
      });
      refetchConsistency();
      refetchStatus();
    },
    onError: (error: Error) => {
      handleAdminError(error);
    },
  });

  const refreshAll = async () => {
    await Promise.all([
      refetchPreflight(),
      refetchStatus(),
      refetchPlans(),
      refetchManualReview(),
      refetchConsistency(),
    ]);
    setActionState({ type: "success", message: "Operations data refreshed." });
  };

  const taskTypeSummary = useMemo(() => {
    if (!status?.task_summary) return [];
    const grouped = new Map<
      string,
      {
        taskType: string;
        queued: number;
        leased: number;
        completed: number;
        failed: number;
        deadLetter: number;
      }
    >();

    for (const row of status.task_summary) {
      const existing = grouped.get(row.task_type) || {
        taskType: row.task_type,
        queued: 0,
        leased: 0,
        completed: 0,
        failed: 0,
        deadLetter: 0,
      };

      const count = Number(row.task_count || 0);
      if (row.status === "queued") existing.queued += count;
      if (row.status === "leased") existing.leased += count;
      if (row.status === "completed") existing.completed += count;
      if (row.status === "failed") existing.failed += count;
      if (row.status === "dead_letter") existing.deadLetter += count;
      grouped.set(row.task_type, existing);
    }

    return Array.from(grouped.values()).sort((a, b) => {
      const totalA = a.queued + a.leased + a.completed + a.failed + a.deadLetter;
      const totalB = b.queued + b.leased + b.completed + b.failed + b.deadLetter;
      return totalB - totalA;
    });
  }, [status?.task_summary]);

  const progressMetrics = useMemo(() => {
    const counts = status?.counts;
    if (!counts) return null;

    const sourceIncidents = Number(counts.source_incidents || 0);
    const articleDocuments = Number(counts.article_documents || 0);
    const sourceEnrichments = Number(counts.source_enrichments || 0);
    const canonicalIncidents = Number(counts.canonical_incidents || 0);
    const queuedWork = taskTypeSummary.reduce((sum, item) => sum + item.queued, 0);
    const leasedWork = taskTypeSummary.reduce((sum, item) => sum + item.leased, 0);

    return {
      fetchCoveragePct: sourceIncidents > 0 ? (articleDocuments / sourceIncidents) * 100 : 0,
      enrichCoveragePct: articleDocuments > 0 ? (sourceEnrichments / articleDocuments) * 100 : 0,
      canonicalYieldPct: sourceIncidents > 0 ? (canonicalIncidents / sourceIncidents) * 100 : 0,
      queuedWork,
      leasedWork,
    };
  }, [status?.counts, taskTypeSummary]);

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            loginMutation.mutate({ username, password });
          }}
          className="w-full rounded-xl border border-zinc-800 bg-[#0d0d1a] p-6"
        >
          <div className="mb-6">
            <p className="section-label mb-2">Operations Login</p>
            <h1 className="text-2xl font-semibold text-zinc-100">V2 Admin Console</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Authenticate against the new Postgres-backed control plane.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-widest text-zinc-500">Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-500/40"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-widest text-zinc-500">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors focus:border-cyan-500/40"
              />
            </label>
          </div>

          {actionState && (
            <div
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                actionState.type === "success"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/20 bg-red-500/10 text-red-300"
              }`}
            >
              {actionState.message}
            </div>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-cyan-400 disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={Shield}
        label="Operations"
        title="V2 Operations Console"
        description="Run plans, monitor queue health, and keep the canonical dataset clean without carrying the old SQLite-era admin surface."
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={refreshAll}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-200 transition-colors hover:border-cyan-500/30 hover:text-cyan-300"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => logoutMutation.mutate()}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-200 transition-colors hover:border-red-500/30 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
          <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-500">
            session key: {ADMIN_SESSION_KEY}
          </span>
        </div>
      </PageHeader>

      {actionState && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            actionState.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/20 bg-red-500/10 text-red-300"
          }`}
        >
          {actionState.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard
          title="Source Incidents"
          value={status?.counts.source_incidents || 0}
          icon={Database}
          variant="primary"
        />
        <StatCard
          title="Fetched Articles"
          value={status?.counts.article_documents || 0}
          icon={Activity}
          variant="success"
        />
        <StatCard
          title="Enrichments"
          value={status?.counts.source_enrichments || 0}
          icon={Sparkles}
          variant="purple"
        />
        <StatCard
          title="Canonicals"
          value={status?.counts.canonical_incidents || 0}
          icon={Workflow}
          variant="danger"
        />
        <StatCard
          title="Expired Leases"
          value={status?.queue_health.expired_leases || 0}
          icon={AlertTriangle}
          variant={(status?.queue_health.expired_leases || 0) > 0 ? "warning" : "success"}
        />
      </div>

      {progressMetrics && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            title="Fetch Coverage"
            value={`${progressMetrics.fetchCoveragePct.toFixed(1)}%`}
            description="Source observations that already have article documents"
            icon={Database}
            variant="primary"
            size="compact"
          />
          <StatCard
            title="Enrichment Coverage"
            value={`${progressMetrics.enrichCoveragePct.toFixed(1)}%`}
            description="Fetched articles that already have source enrichment"
            icon={Sparkles}
            variant="purple"
            size="compact"
          />
          <StatCard
            title="Canonical Yield"
            value={`${progressMetrics.canonicalYieldPct.toFixed(1)}%`}
            description="Public canonicals retained from all raw source observations"
            icon={Workflow}
            variant="danger"
            size="compact"
          />
          <StatCard
            title="Queued / In Flight"
            value={`${formatNumber(progressMetrics.queuedWork)} / ${formatNumber(progressMetrics.leasedWork)}`}
            description="Worker backlog versus currently leased tasks"
            icon={Activity}
            variant="warning"
            size="compact"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <Panel
            title="Preflight"
            description="Runtime and integration readiness for the live v2 stack."
            icon={<CheckCircle2 className="h-5 w-5 text-cyan-400" />}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <StatusRow label="Ready" value={String(Boolean(preflight?.ready))} />
              <StatusRow label="Alembic" value={String((preflight?.database as Record<string, unknown> | undefined)?.current_revision || "n/a")} />
              <StatusRow label="Database" value={String((preflight?.database as Record<string, unknown> | undefined)?.connected || false)} />
              <StatusRow label="Ollama" value={String(((preflight?.integrations as Record<string, unknown> | undefined)?.ollama as Record<string, unknown> | undefined)?.configured || false)} />
              <StatusRow label="Oxylabs" value={String(((preflight?.integrations as Record<string, unknown> | undefined)?.oxylabs as Record<string, unknown> | undefined)?.configured || false)} />
              <StatusRow label="Admin Auth" value={String((((preflight?.integrations as Record<string, unknown> | undefined)?.admin_auth as Record<string, unknown> | undefined)?.api_key_configured || ((preflight?.integrations as Record<string, unknown> | undefined)?.admin_auth as Record<string, unknown> | undefined)?.password_hash_configured) || false)} />
            </div>
            {Array.isArray(preflight?.warnings) && preflight.warnings.length > 0 && (
              <div className="mt-4 space-y-2">
                {preflight.warnings.map((warning) => (
                  <div key={warning} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                    {warning}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="Plan Controls"
            description="Kick off canonical collection and cleanup flows intentionally."
            icon={<Play className="h-5 w-5 text-cyan-400" />}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(plans?.items || []).map((plan) => (
                <div key={plan.name} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                  <p className="text-sm font-semibold text-zinc-100">{plan.name}</p>
                  <p className="mt-1 min-h-[40px] text-xs text-zinc-500">
                    {plan.description || "Named orchestration flow for the v2 runtime."}
                  </p>
                  <button
                    onClick={() => planMutation.mutate({ planName: plan.name })}
                    disabled={planMutation.isPending}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-500/20 disabled:opacity-60"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Run {plan.name}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => qualityMutation.mutate()}
                disabled={qualityMutation.isPending}
                className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-sm text-violet-300 transition-colors hover:bg-violet-500/20 disabled:opacity-60"
              >
                Run Data-Quality Sweep
              </button>
              <button
                onClick={() => consistencyMutation.mutate()}
                disabled={consistencyMutation.isPending}
                className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-60"
              >
                Run Consistency Sweep
              </button>
            </div>
          </Panel>

          <Panel
            title="Task Summary"
            description="How the v2 worker queue is distributed right now."
            icon={<Terminal className="h-5 w-5 text-cyan-400" />}
          >
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {taskTypeSummary.map((item) => (
                <div key={item.taskType} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-mono text-sm text-zinc-100">{item.taskType}</p>
                    <span className="text-xs text-zinc-500">
                      {item.queued + item.leased + item.completed + item.failed + item.deadLetter} total
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <StatusPill label="Queued" value={item.queued} />
                    <StatusPill label="Leased" value={item.leased} />
                    <StatusPill label="Completed" value={item.completed} />
                    <StatusPill label="Failed" value={item.failed} />
                    <StatusPill label="Dead Letter" value={item.deadLetter} className="col-span-2" />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title="Recent Runs"
            description="Latest persisted orchestration and worker activity."
            icon={<Activity className="h-5 w-5 text-cyan-400" />}
          >
            <div className="space-y-3">
              {(status?.recent_runs || []).slice(0, 8).map((run, index) => (
                <div key={index} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-xs text-zinc-200">{String(run.run_type || run.run_id || "run")}</p>
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500">{String(run.status || "unknown")}</span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    Started {formatDate(String(run.started_at || ""))}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Manual Review Queue"
            description="Rows that exhausted automatic re-enrichment."
            icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}
          >
            <div className="space-y-3">
              {(manualReview?.items || []).slice(0, 8).map((item, index) => (
                <div key={index} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="truncate text-sm font-medium text-zinc-100">
                    {String(item.institution_name || item.raw_institution_name || item.title || "Unnamed incident")}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{String(item.manual_review_reason || "Awaiting operator review")}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Consistency Candidates"
            description="Canonicals whose top-level fields may have drifted."
            icon={<Sparkles className="h-5 w-5 text-emerald-400" />}
          >
            <div className="space-y-3">
              {(consistencyCandidates?.items || []).slice(0, 8).map((item, index) => (
                <div key={index} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="truncate text-sm font-medium text-zinc-100">
                    {String(item.display_name || item.institution_name || item.canonical_incident_id || "Canonical")}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {String(item.reason || item.drift_reason || "Projection drift candidate")}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0d0d1a] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="section-label mb-1">{title}</p>
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2">{icon}</div>
      </div>
      {children}
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-zinc-600">{label}</p>
      <p className="mt-1 font-mono text-sm text-zinc-100">{value}</p>
    </div>
  );
}

function StatusPill({
  label,
  value,
  className = "",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 ${className}`}>
      <p className="text-[10px] uppercase tracking-widest text-zinc-600">{label}</p>
      <p className="mt-1 font-mono text-sm text-zinc-100">{formatNumber(value)}</p>
    </div>
  );
}
