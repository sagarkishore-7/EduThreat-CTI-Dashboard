"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ADMIN_SESSION_KEY,
  cancelV2Task,
  getStoredAdminSession,
  getV2ConsistencyCandidates,
  getV2ManualReviewQueue,
  getV2Plans,
  getV2Preflight,
  getV2RejectedEnrichments,
  getV2ClassifierQuality,
  getV2RuntimeStatus,
  getV2Tasks,
  isAdminAuthError,
  loginV2Admin,
  logoutV2Admin,
  runV2ConsistencySweep,
  runV2DataQualitySweep,
  runV2Plan,
  setStoredAdminSession,
} from "@/lib/admin-api";
import { getIncidents } from "@/lib/api";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import {
  Ban,
  CheckCircle2,
  Cpu,
  Layers,
  Loader2,
  LogIn,
  LogOut,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

type ActionState =
  | {
      type: "success" | "error";
      message: string;
    }
  | null;

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
    setStoredAdminSession(null);
    setToken(null);
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
      setStoredAdminSession(response.session_token);
      setToken(response.session_token);
      setPassword("");
      setActionState({ type: "success", message: "Authenticated for the v2 operations console." });
    },
    onError: (error: Error) => handleAdminError(error),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!token) return;
      await logoutV2Admin(token);
    },
    onSettled: () => {
      setStoredAdminSession(null);
      setToken(null);
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
    queryFn: () => getV2ManualReviewQueue(token!, 12),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  });

  const rejectedQuery = useQuery({
    queryKey: ["admin-v2-rejected", token],
    queryFn: () => getV2RejectedEnrichments(token!, 12),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  });

  const consistencyQuery = useQuery({
    queryKey: ["admin-v2-consistency", token],
    queryFn: () => getV2ConsistencyCandidates(token!, { limit: 12, scan_limit: 500 }),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  });

  const orchestrationQuery = useQuery({
    queryKey: ["admin-v2-orchestration", token],
    queryFn: () => getV2Tasks(token!, { task_type: "orchestrate_plan", limit: 12 }),
    enabled: Boolean(token),
    refetchInterval: 15_000,
  });

  // Public incidents endpoint returns the count of *open* canonicals (the figure
  // the incidents page shows). The admin /status count is the raw total across
  // all statuses, so we surface both to explain the gap.
  const openCanonicalsQuery = useQuery({
    queryKey: ["admin-v2-open-canonicals", token],
    queryFn: () => getIncidents({ per_page: 1 }),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  });

  const classifierQuery = useQuery({
    queryKey: ["admin-v2-classifier-quality", token],
    queryFn: () => getV2ClassifierQuality(token!, 10),
    enabled: Boolean(token),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const authError = [
      preflightQuery.error,
      statusQuery.error,
      plansQuery.error,
      manualReviewQuery.error,
      rejectedQuery.error,
      consistencyQuery.error,
      orchestrationQuery.error,
    ].find(isAdminAuthError);

    if (token && authError) {
      expireSession(authError.message);
    }
  }, [
    consistencyQuery.error,
    manualReviewQuery.error,
    orchestrationQuery.error,
    plansQuery.error,
    preflightQuery.error,
    queryClient,
    rejectedQuery.error,
    statusQuery.error,
    token,
  ]);

  const refetchAll = async () => {
    await Promise.all([
      preflightQuery.refetch(),
      statusQuery.refetch(),
      plansQuery.refetch(),
      manualReviewQuery.refetch(),
      rejectedQuery.refetch(),
      consistencyQuery.refetch(),
      orchestrationQuery.refetch(),
    ]);
    setActionState({ type: "success", message: "Operations telemetry refreshed." });
  };

  const planMutation = useMutation({
    mutationFn: ({ planName, paid }: { planName: string; paid?: boolean }) =>
      runV2Plan(token!, planName, { background: true, include_paid_rss: paid }),
    onSuccess: (payload) => {
      setActionState({ type: "success", message: `Queued plan: ${JSON.stringify(payload)}` });
      statusQuery.refetch();
    },
    onError: (error: Error) => handleAdminError(error),
  });

  const qualityMutation = useMutation({
    mutationFn: () => runV2DataQualitySweep(token!, 500),
    onSuccess: (payload) => {
      setActionState({ type: "success", message: `Queued data-quality sweep: ${JSON.stringify(payload)}` });
      statusQuery.refetch();
      manualReviewQuery.refetch();
      rejectedQuery.refetch();
    },
    onError: (error: Error) => handleAdminError(error),
  });

  const consistencyMutation = useMutation({
    mutationFn: () => runV2ConsistencySweep(token!, { limit: 100, scan_limit: 1000 }),
    onSuccess: (payload) => {
      setActionState({ type: "success", message: `Queued consistency sweep: ${JSON.stringify(payload)}` });
      statusQuery.refetch();
      consistencyQuery.refetch();
    },
    onError: (error: Error) => handleAdminError(error),
  });

  const cancelMutation = useMutation({
    mutationFn: (taskId: string) => cancelV2Task(token!, taskId),
    onSuccess: (payload) => {
      const cancelled = Boolean((payload as Record<string, unknown>)?.cancelled);
      setActionState({
        type: cancelled ? "success" : "error",
        message: cancelled
          ? `Run cancelled (${String((payload as Record<string, unknown>)?.run_id ?? "").slice(0, 8) || "task"}).`
          : `Not cancellable: ${String((payload as Record<string, unknown>)?.message ?? "already terminal")}`,
      });
      orchestrationQuery.refetch();
      statusQuery.refetch();
    },
    onError: (error: Error) => handleAdminError(error),
  });

  const taskTypeSummary = useMemo(() => {
    if (!statusQuery.data?.task_summary) return [];
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

    for (const row of statusQuery.data.task_summary) {
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
  }, [statusQuery.data?.task_summary]);

  const progressMetrics = useMemo(() => {
    const counts = statusQuery.data?.counts;
    if (!counts) return null;
    const sourceIncidents = Number(counts.source_incidents || 0);
    const articleDocuments = Number(counts.article_documents || 0);
    const selectedArticleSources = Number(counts.selected_article_sources ?? counts.article_documents ?? 0);
    const articleFetchAttempts = Number(counts.article_fetch_attempts || 0);
    const successfulArticleFetchAttempts = Number(counts.successful_article_fetch_attempts || 0);
    const sourceEnrichments = Number(counts.source_enrichments || 0);
    const canonicalIncidents = Number(counts.canonical_incidents || 0);
    const queuedWork = taskTypeSummary.reduce((sum, item) => sum + item.queued, 0);
    const leasedWork = taskTypeSummary.reduce((sum, item) => sum + item.leased, 0);

    return {
      sourceIncidents,
      articleDocuments,
      selectedArticleSources,
      articleFetchAttempts,
      successfulArticleFetchAttempts,
      sourceEnrichments,
      canonicalIncidents,
      fetchCoveragePct: sourceIncidents > 0 ? (selectedArticleSources / sourceIncidents) * 100 : 0,
      fetchSuccessPct: articleFetchAttempts > 0 ? (successfulArticleFetchAttempts / articleFetchAttempts) * 100 : 0,
      enrichCoveragePct: selectedArticleSources > 0 ? (sourceEnrichments / selectedArticleSources) * 100 : 0,
      canonicalYieldPct: sourceIncidents > 0 ? (canonicalIncidents / sourceIncidents) * 100 : 0,
      queuedWork,
      leasedWork,
    };
  }, [statusQuery.data?.counts, taskTypeSummary]);

  const orchestrationTasks = useMemo(() => {
    const items = (orchestrationQuery.data?.items as Array<Record<string, unknown>> | undefined) || [];
    return items
      .filter((t) => ["queued", "leased"].includes(String(t.status)))
      .sort((a, b) => (String(a.status) === "leased" ? -1 : 1) - (String(b.status) === "leased" ? -1 : 1));
  }, [orchestrationQuery.data]);

  // Per-type rows that currently have queued or leased work — the "what's running now".
  const activeTypes = useMemo(
    () => taskTypeSummary.filter((item) => item.queued + item.leased > 0),
    [taskTypeSummary],
  );

  const classifier = classifierQuery.data;
  const totalCanonicals = progressMetrics?.canonicalIncidents || 0;
  const openCanonicals = Number(openCanonicalsQuery.data?.pagination?.total ?? NaN);
  const hasOpenCount = Number.isFinite(openCanonicals);
  const nonOpenCanonicals = hasOpenCount ? Math.max(totalCanonicals - openCanonicals, 0) : 0;

  const planRows = plansQuery.data?.items || [];
  const preflight = preflightQuery.data;
  const manualReview = manualReviewQuery.data;
  const rejected = rejectedQuery.data;
  const consistency = consistencyQuery.data;
  const status = statusQuery.data;

  const dbRevision = String((preflight?.database as Record<string, unknown> | undefined)?.current_revision || "n/a");
  const dbConnected = Boolean((preflight?.database as Record<string, unknown> | undefined)?.connected);
  const recentRuns = (status?.recent_runs || []).slice(0, 7);
  const recentTasks = (status?.recent_tasks || []).slice(0, 8);
  const consoleEvents = [
    ...recentTasks.map((task) => ({
      key: `task-${String(task.task_id || task.target_id || Math.random())}`,
      kind: String(task.status || "info"),
      label: String(task.task_type || "task"),
      message: `${String(task.status || "unknown")} · ${String(task.target_table || "target")} ${String(task.target_id || "")}`.trim(),
      ts: String(task.updated_at || task.leased_at || task.created_at || ""),
    })),
    ...recentRuns.map((run) => ({
      key: `run-${String(run.run_id || Math.random())}`,
      kind: String(run.status || "info"),
      label: String(run.run_type || "run"),
      message: `${String(run.status || "unknown")} · ${String(run.scope || "runtime")}`.trim(),
      ts: String(run.started_at || run.updated_at || ""),
    })),
  ].slice(0, 12);

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[72vh] max-w-lg items-center justify-center">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            loginMutation.mutate({ username, password });
          }}
          className="ops-shell w-full overflow-hidden"
        >
          <div className="border-b border-zinc-800/70 bg-[linear-gradient(120deg,rgba(0,216,180,0.08),rgba(129,140,248,0.05)_60%,transparent)] px-6 py-6">
            <p className="section-label mb-2">Operations Login</p>
            <h1 className="text-2xl font-semibold text-zinc-100">V2 Admin Console</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Authenticate into the Postgres-backed control plane for plans, queue health, review queues, and data-quality sweeps.
            </p>
          </div>
          <div className="space-y-4 px-6 py-6">
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-zinc-500">Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="input-field w-full px-3 py-2.5"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-zinc-500">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input-field w-full px-3 py-2.5"
              />
            </label>
            {actionState && (
              <StatusBanner type={actionState.type} message={actionState.message} />
            )}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-[#08110f] transition-colors hover:bg-emerald-300 disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="ops-shell overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-zinc-800/70 bg-[linear-gradient(120deg,rgba(0,216,180,0.08),rgba(129,140,248,0.05)_60%,transparent)] px-6 py-5 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <p className="section-label mb-1">Operations Console</p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">V2 pipeline control plane</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Live queue health, scheduled plans, corpus growth, hard rejects, and manual review pressure in one operator surface.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-mono text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(0,216,180,0.8)]" />
              SESSION ACTIVE
              <span className="text-zinc-500">· {token.slice(0, 10)}…</span>
            </div>
            <button onClick={refetchAll} className="ops-chip">
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
            <button
              onClick={() => logoutMutation.mutate()}
              className="ops-chip ops-chip-danger"
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-3 w-3" />
              Sign out
            </button>
          </div>
        </div>

        <div className="grid gap-3 px-6 py-5 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <HealthCard label="Source incidents" value={formatNumber(progressMetrics?.sourceIncidents || 0)} detail="Raw source observations" tone="brand" />
          <HealthCard
            label="Selected article sources"
            value={formatNumber(progressMetrics?.selectedArticleSources || 0)}
            detail={`${progressMetrics ? progressMetrics.fetchCoveragePct.toFixed(1) : "0.0"}% source coverage · ${formatNumber(progressMetrics?.articleDocuments || 0)} docs retained`}
            tone="info"
          />
          <HealthCard label="Source enrichments" value={formatNumber(progressMetrics?.sourceEnrichments || 0)} detail={`${progressMetrics ? progressMetrics.enrichCoveragePct.toFixed(1) : "0.0"}% enrichment coverage`} tone="pulse" />
          <HealthCard
            label="Canonicals (open)"
            value={formatNumber(hasOpenCount ? openCanonicals : totalCanonicals)}
            detail={
              hasOpenCount
                ? `${formatNumber(totalCanonicals)} total · ${formatNumber(nonOpenCanonicals)} non-open (merged/excluded)`
                : `${formatNumber(totalCanonicals)} total across all statuses`
            }
            tone="threat"
          />
          <HealthCard label="Manual review" value={formatNumber(manualReview?.meta.returned || 0)} detail="Current queue sample" tone="warn" />
          <HealthCard label="Hard rejects" value={formatNumber(rejected?.meta.returned || 0)} detail="Victimless / non-canonicalizable sample" tone="danger" />
        </div>
      </div>

      {actionState && <StatusBanner type={actionState.type} message={actionState.message} />}

      {/* BAND 1 — at-a-glance operations: active runs, workers, data plane (no scrolling) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="ops-panel overflow-hidden">
          <div className="ops-panel-head">
            <div>
              <p className="ops-subtle">Orchestration</p>
              <h2 className="ops-title">Active &amp; queued runs</h2>
            </div>
            {orchestrationTasks.length > 0 && (
              <span className="ops-chip ops-chip-brand">{orchestrationTasks.length} active</span>
            )}
          </div>
          <div className="space-y-2 px-5 py-4">
            {orchestrationTasks.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 px-3 py-5 text-sm text-zinc-500">
                No runs are queued or executing right now.
              </div>
            ) : (
              orchestrationTasks.map((task) => {
                const running = String(task.status) === "leased";
                const taskId = String(task.task_id);
                const runId = String(task.run_id || task.task_id);
                return (
                  <div
                    key={taskId}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800/70 bg-zinc-900/35 px-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            running
                              ? "animate-pulse bg-emerald-400 shadow-[0_0_8px_rgba(0,216,180,0.8)]"
                              : "bg-amber-400",
                          )}
                        />
                        <p className="truncate font-mono text-xs text-zinc-200">{runId.slice(0, 8)}</p>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]",
                            running ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300",
                          )}
                        >
                          {running ? "running" : "queued"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-zinc-500">
                        attempt {String(task.attempt_count ?? 0)}/{String(task.max_attempts ?? 5)} ·{" "}
                        {String(task.task_type)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (running && !window.confirm("This run is currently executing. Cancel it?")) return;
                        cancelMutation.mutate(taskId);
                      }}
                      disabled={cancelMutation.isPending}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-medium text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-50"
                    >
                      {cancelMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Ban className="h-3 w-3" />
                      )}
                      Cancel
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="ops-panel overflow-hidden">
          <div className="ops-panel-head">
            <div>
              <p className="ops-subtle">Workers &amp; queue</p>
              <h2 className="ops-title">Live processing</h2>
            </div>
            <Cpu className="h-4 w-4 text-zinc-600" />
          </div>
          <div className="grid grid-cols-2 gap-3 px-5 py-4">
            <MetaBox
              label="Leased / running"
              value={formatNumber(progressMetrics?.leasedWork || 0)}
              tone={(progressMetrics?.leasedWork || 0) > 0 ? "ok" : "neutral"}
            />
            <MetaBox label="Queued / waiting" value={formatNumber(progressMetrics?.queuedWork || 0)} tone="neutral" />
          </div>
          <div className="border-t border-zinc-800/70 px-5 py-4">
            <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">Active by stage</p>
            <div className="space-y-1.5">
              {activeTypes.length > 0 ? (
                activeTypes.map((item) => (
                  <div
                    key={item.taskType}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/60 bg-[#0b0f17]/80 px-3 py-1.5"
                  >
                    <span className="truncate font-mono text-[11px] text-zinc-300">{item.taskType}</span>
                    <span className="shrink-0 font-mono text-[11px]">
                      <span className="text-emerald-300">{item.leased}</span>
                      <span className="text-zinc-600"> run</span>
                      <span className="mx-1 text-zinc-700">·</span>
                      <span className="text-amber-300">{item.queued}</span>
                      <span className="text-zinc-600"> queued</span>
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-500">Queue is idle — no work in flight.</p>
              )}
            </div>
          </div>
        </div>

        <div className="ops-panel overflow-hidden">
          <div className="ops-panel-head">
            <div>
              <p className="ops-subtle">Data plane</p>
              <h2 className="ops-title">Database &amp; preflight</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 px-5 py-4">
            <MetaBox label="DB connected" value={dbConnected ? "true" : "false"} tone={dbConnected ? "ok" : "bad"} />
            <MetaBox label="Alembic rev" value={dbRevision} tone="neutral" />
            <MetaBox
              label="Fetch success"
              value={`${progressMetrics ? progressMetrics.fetchSuccessPct.toFixed(1) : "0.0"}%`}
              tone={(progressMetrics?.fetchSuccessPct || 0) >= 70 ? "ok" : "warn"}
            />
            <MetaBox
              label="Expired leases"
              value={formatNumber(status?.queue_health.expired_leases || 0)}
              tone={(status?.queue_health.expired_leases || 0) > 0 ? "bad" : "ok"}
            />
            <MetaBox
              label="Preflight ready"
              value={String(Boolean(preflight?.ready))}
              tone={preflight?.ready ? "ok" : "warn"}
            />
            <MetaBox
              label="Fetch attempts"
              value={formatNumber(progressMetrics?.articleFetchAttempts || 0)}
              tone="neutral"
            />
          </div>
          {Array.isArray(preflight?.warnings) && preflight.warnings.length > 0 && (
            <div className="border-t border-zinc-800/70 px-5 py-4">
              <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">Warnings</p>
              <div className="space-y-2">
                {preflight.warnings.map((warning) => (
                  <div
                    key={warning}
                    className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300"
                  >
                    {warning}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BAND 2 — plan triggers (full width) */}
      <div className="ops-panel overflow-hidden">
        <div className="ops-panel-head">
          <div>
            <p className="ops-subtle">Plan orchestration</p>
            <h2 className="ops-title">Scheduled plans &amp; manual triggers</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => qualityMutation.mutate()} className="ops-chip ops-chip-pulse" disabled={qualityMutation.isPending}>
              <Sparkles className="h-3 w-3" />
              Quality sweep
            </button>
            <button onClick={() => consistencyMutation.mutate()} className="ops-chip ops-chip-brand" disabled={consistencyMutation.isPending}>
              <CheckCircle2 className="h-3 w-3" />
              Consistency sweep
            </button>
          </div>
        </div>
        <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 xl:grid-cols-3">
          {planRows.map((plan) => (
            <div key={plan.name} className="flex flex-col rounded-2xl border border-zinc-800/70 bg-zinc-900/35 p-4">
              <p className="text-sm font-semibold text-zinc-100">{plan.name}</p>
              <p className="mt-1 flex-1 text-xs text-zinc-500">
                {plan.description || "Named orchestration flow for the v2 runtime."}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="font-mono text-[11px] text-zinc-500">
                  {plan.worker_max_tasks ? `${plan.worker_max_tasks} max` : "runtime-managed"}
                </span>
                <button
                  onClick={() => planMutation.mutate({ planName: plan.name })}
                  disabled={planMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-400/15 disabled:opacity-60"
                >
                  <Play className="h-3.5 w-3.5" />
                  Run
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BAND 3 — task distribution + live log (two columns) */}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="ops-panel overflow-hidden">
          <div className="ops-panel-head">
            <div>
              <p className="ops-subtle">Task summary</p>
              <h2 className="ops-title">Queue distribution by stage</h2>
            </div>
            <Layers className="h-4 w-4 text-zinc-600" />
          </div>
          <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
            {taskTypeSummary.map((item) => (
              <div key={item.taskType} className="rounded-2xl border border-zinc-800/70 bg-zinc-900/35 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="truncate font-mono text-xs text-zinc-100">{item.taskType}</p>
                  <span className="shrink-0 text-[11px] text-zinc-500">
                    {formatNumber(item.queued + item.leased + item.completed + item.failed + item.deadLetter)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <TaskPill label="Queued" value={item.queued} />
                  <TaskPill label="Leased" value={item.leased} />
                  <TaskPill label="Completed" value={item.completed} />
                  <TaskPill label="Failed" value={item.failed} />
                  <TaskPill label="Dead letter" value={item.deadLetter} full />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ops-panel overflow-hidden">
          <div className="ops-panel-head">
            <div>
              <p className="ops-subtle">Live operations log</p>
              <h2 className="ops-title">Recent queue &amp; run activity</h2>
            </div>
            <div className="ops-chip ops-chip-brand">Snapshot</div>
          </div>
          <div className="space-y-2 bg-[#090c14] px-5 py-4 font-mono text-[11px]">
            {consoleEvents.map((event) => (
              <div key={event.key} className="flex items-start gap-3 text-zinc-300">
                <span className="shrink-0 text-zinc-600">{formatConsoleTimestamp(event.ts)}</span>
                <span className={cn("shrink-0 font-semibold", consoleTone(event.kind))}>
                  [{event.label.toUpperCase()}]
                </span>
                <span className="text-zinc-400">{event.message}</span>
              </div>
            ))}
            {consoleEvents.length === 0 && (
              <p className="text-zinc-600">No recent queue or run activity is available yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* BAND 3.5 — LLM title-gate quality + extraction quality */}
      <div className="ops-panel overflow-hidden">
        <div className="ops-panel-head">
          <div>
            <p className="ops-subtle">Classifier quality</p>
            <h2 className="ops-title">LLM title gate → article gate → extraction</h2>
          </div>
          <ShieldCheck className="h-4 w-4 text-zinc-600" />
        </div>

        {!classifier ? (
          <div className="px-5 py-8 text-sm text-zinc-500">
            {classifierQuery.isError ? "Quality telemetry unavailable." : "Loading classifier telemetry…"}
          </div>
        ) : (
          <div className="space-y-4 px-5 py-4">
            {/* headline stats */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/35 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-rose-300" />
                  <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Title FP rate</p>
                </div>
                <p className="font-mono text-[28px] leading-none text-rose-300">
                  {classifier.second_gate.llm_gated.fp_rate_pct ?? "—"}
                  {classifier.second_gate.llm_gated.fp_rate_pct !== null ? "%" : ""}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {classifier.second_gate.llm_gated.fp_rate_pct !== null &&
                  classifier.second_gate.llm_gated.fp_rate_pct < classifier.second_gate.keyword_baseline_reject_pct ? (
                    <span className="text-emerald-300">
                      ▼ down from ~{classifier.second_gate.keyword_baseline_reject_pct}% keyword baseline
                    </span>
                  ) : (
                    <span>vs ~{classifier.second_gate.keyword_baseline_reject_pct}% keyword baseline</span>
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/35 p-4">
                <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">Title relevant → enriched</p>
                <p className="font-mono text-[28px] leading-none text-zinc-100">
                  {formatNumber(classifier.second_gate.llm_gated.judged)}
                </p>
                <p className="mt-2 text-xs">
                  <span className="text-emerald-300">{formatNumber(classifier.second_gate.llm_gated.true_positive)} kept</span>
                  <span className="mx-1 text-zinc-600">·</span>
                  <span className="text-rose-300">{formatNumber(classifier.second_gate.llm_gated.false_positive)} rejected</span>
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/35 p-4">
                <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">Titles classified</p>
                <p className="font-mono text-[28px] leading-none text-sky-300">
                  {formatNumber(classifier.title_relevance.llm_classified)}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {formatNumber(classifier.title_relevance.relevant)} relevant ·{" "}
                  {formatNumber(classifier.title_relevance.irrelevant)} dropped ·{" "}
                  {formatNumber(classifier.title_relevance.pending)} pending
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/35 p-4">
                <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">Edu precision (kept)</p>
                <p className="font-mono text-[28px] leading-none text-emerald-300">
                  {classifier.second_gate.llm_gated.tp_rate_pct ?? "—"}
                  {classifier.second_gate.llm_gated.tp_rate_pct !== null ? "%" : ""}
                </p>
                <p className="mt-2 text-xs text-zinc-500">of title-relevant rows confirmed edu by the article gate</p>
              </div>
            </div>

            {/* extraction quality */}
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                Extraction quality · {formatNumber(classifier.extraction_quality.open_canonicals)} open canonicals
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetaBox label="With institution" value={`${classifier.extraction_quality.with_institution_pct}%`} tone={classifier.extraction_quality.with_institution_pct >= 90 ? "ok" : "warn"} />
                <MetaBox label="With date" value={`${classifier.extraction_quality.with_date_pct}%`} tone={classifier.extraction_quality.with_date_pct >= 80 ? "ok" : "warn"} />
                <MetaBox label="With actor" value={`${classifier.extraction_quality.with_actor_pct}%`} tone="neutral" />
                <MetaBox label="Edu confirmed" value={`${classifier.extraction_quality.edu_confirmed_pct}%`} tone={classifier.extraction_quality.edu_confirmed_pct >= 95 ? "ok" : "warn"} />
              </div>
            </div>

            {/* spot-check samples */}
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.04] p-4">
                <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-rose-300">
                  False positives — title kept, article gate rejected
                </p>
                <div className="space-y-2">
                  {classifier.samples.false_positives.length === 0 && (
                    <p className="text-sm text-zinc-500">No title false positives in this sample.</p>
                  )}
                  {classifier.samples.false_positives.map((s, i) => (
                    <div key={`fp-${i}`} className="rounded-xl border border-zinc-800/70 bg-[#0b0f17]/80 p-3">
                      <p className="truncate text-sm font-medium text-zinc-200" title={s.title}>{s.title}</p>
                      {s.rejected_reason && (
                        <p className="mt-1 text-[11px] text-rose-300/80">rejected: {s.rejected_reason}</p>
                      )}
                      {s.title_reason && <p className="mt-0.5 text-[11px] text-zinc-500">title said: {s.title_reason}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
                <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-emerald-300">
                  True positives — title kept → canonicalized
                </p>
                <div className="space-y-2">
                  {classifier.samples.true_positives.length === 0 && (
                    <p className="text-sm text-zinc-500">No canonicalized samples yet.</p>
                  )}
                  {classifier.samples.true_positives.map((s, i) => (
                    <div key={`tp-${i}`} className="rounded-xl border border-zinc-800/70 bg-[#0b0f17]/80 p-3">
                      <p className="truncate text-sm font-medium text-zinc-200" title={s.title}>{s.title}</p>
                      <p className="mt-1 text-[11px] text-emerald-300/80">
                        → {s.institution_name || "(institution n/a)"}
                        {s.incident_date ? ` · ${s.incident_date}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BAND 4 — review queues spread horizontally (was a tall stacked column) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <QueuePanel
          eyebrow="Manual review"
          title="Exhausted re-enrichment"
          items={(manualReview?.items || []).slice(0, 6)}
          empty="No rows are waiting in the manual review queue."
          accent="warn"
          reasonKey="manual_review_reason"
        />
        <QueuePanel
          eyebrow="Hard rejects"
          title="Intentionally excluded"
          items={(rejected?.items || []).slice(0, 6)}
          empty="No hard-rejected enrichments are visible in this sample."
          accent="danger"
          reasonKey="failed_reason"
        />
        <QueuePanel
          eyebrow="Consistency drift"
          title="Canonicals needing review"
          items={(consistency?.items || []).slice(0, 6)}
          empty="No consistency candidates are visible in this sample."
          accent="brand"
          reasonKey="reason"
        />
      </div>

      {/* BAND 5 — run history (full width) */}
      <div className="ops-panel overflow-hidden">
        <div className="ops-panel-head">
          <div>
            <p className="ops-subtle">Recent runs</p>
            <h2 className="ops-title">Execution history</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Run</th>
                <th>Type</th>
                <th>Status</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run, index) => (
                <tr key={`${String(run.run_id || run.run_type || index)}`}>
                  <td className="font-mono text-xs text-zinc-400">{String(run.run_id || "n/a")}</td>
                  <td>{String(run.run_type || "runtime")}</td>
                  <td>
                    <RunStatus status={String(run.status || "unknown")} />
                  </td>
                  <td className="text-zinc-500">{formatDate(String(run.started_at || run.updated_at || ""))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBanner({ type, message }: { type: "success" | "error"; message: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        type === "success"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
          : "border-red-500/20 bg-red-500/10 text-red-300",
      )}
    >
      {message}
    </div>
  );
}

function HealthCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "brand" | "info" | "pulse" | "threat" | "warn" | "danger";
}) {
  const toneConfig = {
    brand: "bg-emerald-400 text-emerald-300 bg-emerald-400/10",
    info: "bg-sky-400 text-sky-300 bg-sky-400/10",
    pulse: "bg-indigo-400 text-indigo-300 bg-indigo-400/10",
    threat: "bg-red-400 text-red-300 bg-red-400/10",
    warn: "bg-amber-400 text-amber-300 bg-amber-400/10",
    danger: "bg-rose-400 text-rose-300 bg-rose-400/10",
  }[tone].split(" ");

  return (
    <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
        <span className={cn("h-2.5 w-2.5 rounded-full", toneConfig[0], "shadow-[0_0_10px_currentColor]")} />
      </div>
      <p className={cn("font-mono text-[28px] leading-none", toneConfig[1])}>{value}</p>
      <p className="mt-2 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

function MetaBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "bad" | "neutral";
}) {
  const toneClass = {
    ok: "text-emerald-300",
    warn: "text-amber-300",
    bad: "text-red-300",
    neutral: "text-zinc-100",
  }[tone];
  return (
    <div className="rounded-2xl border border-zinc-800/70 bg-[#0b0f17]/95 p-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className={cn("mt-2 font-mono text-lg", toneClass)}>{value}</p>
    </div>
  );
}

function QueuePanel({
  eyebrow,
  title,
  items,
  empty,
  accent,
  reasonKey,
}: {
  eyebrow: string;
  title: string;
  items: Array<Record<string, unknown>>;
  empty: string;
  accent: "warn" | "danger" | "brand";
  reasonKey: string;
}) {
  const accentClass = {
    warn: "text-amber-300 border-amber-500/20 bg-amber-500/10",
    danger: "text-red-300 border-red-500/20 bg-red-500/10",
    brand: "text-emerald-300 border-emerald-500/20 bg-emerald-500/10",
  }[accent];

  return (
    <div className="ops-panel overflow-hidden">
      <div className="ops-panel-head">
        <div>
          <p className="ops-subtle">{eyebrow}</p>
          <h2 className="ops-title">{title}</h2>
        </div>
      </div>
      <div className="space-y-3 px-5 py-4">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div key={`${String(item.source_incident_id || item.canonical_incident_id || index)}`} className="rounded-2xl border border-zinc-800/70 bg-zinc-900/35 p-3">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-100">
                    {String(item.institution_name || item.display_name || item.title || item.source_incident_id || "Unnamed row")}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {String(item.source_name || item.source_group || item.source_incident_id || item.canonical_incident_id || "")}
                  </p>
                </div>
                <span className={cn("rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.16em]", accentClass)}>
                  {accent}
                </span>
              </div>
              <p className="text-sm text-zinc-400">
                {String(item[reasonKey] || item.drift_reason || "Operator review recommended")}
              </p>
              {"updated_at" in item && item.updated_at ? (
                <p className="mt-2 text-[11px] font-mono text-zinc-600">{formatDate(String(item.updated_at))}</p>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 px-3 py-5 text-sm text-zinc-500">
            {empty}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskPill({
  label,
  value,
  full = false,
}: {
  label: string;
  value: number;
  full?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border border-zinc-800/70 bg-[#0b0f17]/95 px-3 py-2", full && "sm:col-span-2")}>
      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-sm text-zinc-100">{formatNumber(value)}</p>
    </div>
  );
}

function RunStatus({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const cls =
    normalized === "completed" || normalized === "success" || normalized === "running"
      ? "ops-chip ops-chip-brand"
      : normalized === "failed" || normalized === "dead_letter"
        ? "ops-chip ops-chip-danger"
        : "ops-chip";

  return <span className={cls}>{status}</span>;
}

function formatConsoleTimestamp(value: string) {
  if (!value) return "--:--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function consoleTone(kind: string) {
  const normalized = kind.toLowerCase();
  if (normalized.includes("fail") || normalized.includes("dead")) return "text-red-300";
  if (normalized.includes("lease") || normalized.includes("queued")) return "text-amber-300";
  if (normalized.includes("running") || normalized.includes("completed") || normalized.includes("success")) return "text-emerald-300";
  return "text-sky-300";
}
