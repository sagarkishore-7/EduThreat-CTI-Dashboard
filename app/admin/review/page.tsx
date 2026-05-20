"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getStoredAdminSession,
  getV2ManualReviewQueue,
  isAdminAuthError,
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

  useEffect(() => {
    if (token && isAdminAuthError(reviewQuery.error)) {
      expireSession(reviewQuery.error.message);
    }
  }, [reviewQuery.error, token]);

  const sweepMutation = useMutation({
    mutationFn: () => runV2DataQualitySweep(token!, 1000),
    onSuccess: (payload) => {
      setMessage(`Sweep queued: ${JSON.stringify(payload)}`);
      reviewQuery.refetch();
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
      <div className="mx-auto flex min-h-[72vh] max-w-lg items-center justify-center">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            loginMutation.mutate({ username, password });
          }}
          className="ops-shell w-full overflow-hidden"
        >
          <div className="border-b border-zinc-800/70 bg-[linear-gradient(120deg,rgba(0,216,180,0.08),rgba(129,140,248,0.05)_60%,transparent)] px-6 py-6">
            <p className="section-label mb-2">Manual Review</p>
            <h1 className="text-2xl font-semibold text-zinc-100">Read-only review queue</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Authenticate to inspect source enrichments that exhausted automation. Queue actions stay in the backend control plane.
            </p>
          </div>
          <div className="space-y-4 px-6 py-6">
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="input-field w-full px-3 py-2.5"
              placeholder="Username"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-field w-full px-3 py-2.5"
              placeholder="Password"
            />
            {message && <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-300">{message}</div>}
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-[#08110f]"
            >
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
        <div className="flex flex-col gap-4 border-b border-zinc-800/70 bg-[linear-gradient(120deg,rgba(0,216,180,0.08),rgba(129,140,248,0.05)_60%,transparent)] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-label mb-1">Manual Review Queue</p>
            <h1 className="text-2xl font-semibold text-zinc-100">Rows waiting for human judgment</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Source enrichments that exhausted automatic cleanup and need an operator to confirm whether they belong in the retained education-sector corpus.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="ops-chip">
              Back to operations
            </Link>
            <button onClick={() => reviewQuery.refetch()} className="ops-chip">
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
            <button onClick={() => sweepMutation.mutate()} className="ops-chip ops-chip-pulse">
              <RefreshCw className="h-3 w-3" />
              Run sweep
            </button>
          </div>
        </div>
        {message && <div className="border-b border-zinc-800/70 px-6 py-3 text-sm text-zinc-300">{message}</div>}
        <div className="space-y-3 px-6 py-5">
          {reviewQuery.isLoading ? (
            <div className="h-40 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />
          ) : (reviewQuery.data?.items || []).length > 0 ? (
            (reviewQuery.data?.items || []).map((item, index) => (
              <div key={`${String(item.source_incident_id || index)}`} className="rounded-2xl border border-zinc-800/70 bg-zinc-900/35 p-4">
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
                  <div className="shrink-0 rounded-xl border border-zinc-800/70 bg-[#0b0f17]/95 px-4 py-3 text-right text-xs text-zinc-500">
                    <p>Attempts: {String(item.re_enrich_attempts || 0)}</p>
                    <p className="mt-1 font-mono">{formatDate(String(item.updated_at || item.created_at || ""))}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 px-4 py-12 text-center text-sm text-zinc-500">
              No rows are waiting in the manual review queue right now.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
