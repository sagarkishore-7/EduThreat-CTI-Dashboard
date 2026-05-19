"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getStoredAdminSession,
  isAdminAuthError,
  getV2ManualReviewQueue,
  loginV2Admin,
  runV2DataQualitySweep,
  setStoredAdminSession,
} from "@/lib/admin-api";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ManualReviewPage() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setToken(getStoredAdminSession());
  }, []);

  const expireSession = (reason: string = "Your admin session expired. Please sign in again.") => {
    setStoredAdminSession(null);
    setToken(null);
    setMessage(reason);
  };

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      loginV2Admin(username, password),
    onSuccess: (response) => {
      setStoredAdminSession(response.session_token);
      setToken(response.session_token);
      setPassword("");
      setMessage("Authenticated for v2 manual review.");
    },
    onError: (error: Error) => {
      if (isAdminAuthError(error)) {
        expireSession(error.message);
        return;
      }
      setMessage(error.message);
    },
  });

  const reviewQuery = useQuery({
    queryKey: ["manual-review-page", token],
    queryFn: () => getV2ManualReviewQueue(token!, 200),
    enabled: Boolean(token),
  });

  const data = reviewQuery.data;
  const isLoading = reviewQuery.isLoading;
  const refetch = reviewQuery.refetch;

  useEffect(() => {
    if (token && isAdminAuthError(reviewQuery.error)) {
      expireSession(reviewQuery.error.message);
    }
  }, [reviewQuery.error, token]);

  const sweepMutation = useMutation({
    mutationFn: () => runV2DataQualitySweep(token!, 1000),
    onSuccess: (payload) => {
      setMessage(`Sweep queued: ${JSON.stringify(payload)}`);
      refetch();
    },
    onError: (error: Error) => {
      if (isAdminAuthError(error)) {
        expireSession(error.message);
        return;
      }
      setMessage(error.message);
    },
  });

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
            <p className="section-label mb-2">Manual Review</p>
            <h1 className="text-2xl font-semibold text-zinc-100">V2 Review Queue</h1>
            <p className="mt-1 text-sm text-zinc-500">
              This queue is now read-only in the dashboard. Operators can review flagged canonicals here and use the backend control plane for sweeps.
            </p>
          </div>
          <div className="space-y-4">
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100"
              placeholder="Username"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100"
              placeholder="Password"
            />
          </div>
          {message && <p className="mt-4 text-sm text-zinc-400">{message}</p>}
          <button
            type="submit"
            className="mt-6 w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-zinc-950"
          >
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-[#0d0d1a] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="section-label mb-1">Manual Review Queue</p>
          <h1 className="text-2xl font-semibold text-zinc-100">V2 Review Queue</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Flagged source enrichments that exhausted automatic cleanup. This view is intentionally read-only so we don&apos;t preserve old ad hoc edit flows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin" className="rounded-lg border border-zinc-700 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-200">
            Back to Operations
          </Link>
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-zinc-700 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-200"
          >
            Refresh
          </button>
          <button
            onClick={() => sweepMutation.mutate()}
            className="inline-flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-sm text-violet-300"
          >
            <RefreshCw className="h-4 w-4" />
            Run Sweep
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-300">
          {message}
        </div>
      )}

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
      ) : (
        <div className="space-y-3">
          {(data?.items || []).map((item, index) => (
            <div key={index} className="rounded-xl border border-zinc-800 bg-[#0d0d1a] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <p className="truncate text-base font-semibold text-zinc-100">
                      {String(item.institution_name || item.raw_institution_name || item.title || "Unnamed incident")}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-zinc-500">
                    {String(item.manual_review_reason || "Flagged for operator review")}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-zinc-500">
                  <p>Attempts: {String(item.re_enrich_attempts || 0)}</p>
                  <p>Updated: {formatDate(String(item.updated_at || item.created_at || ""))}</p>
                </div>
              </div>
            </div>
          ))}
          {(data?.items || []).length === 0 && (
            <div className="rounded-xl border border-zinc-800 bg-[#0d0d1a] px-4 py-12 text-center text-sm text-zinc-500">
              No rows are waiting in the manual review queue right now.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
