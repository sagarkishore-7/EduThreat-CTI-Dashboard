"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";

interface ReviewIncident {
  incident_id: string;
  institution_name: string | null;
  title: string | null;
  incident_date: string | null;
  source_published_date: string | null;
  discovery_date: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  primary_url: string | null;
  manual_review_reason: string | null;
  re_enrich_attempts: number | null;
  manually_edited: number | null;
  manually_edited_fields: string[];
}

const EDITABLE_FIELDS: Array<keyof ReviewIncident> = [
  "institution_name",
  "incident_date",
  "source_published_date",
  "discovery_date",
  "country",
  "region",
  "city",
];

export default function ManualReviewPage() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<ReviewIncident[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<ReviewIncident>>>({});

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("admin_session") : null;
    if (stored) setSessionToken(stored);
  }, []);

  const authHeaders = useCallback(
    () => (sessionToken ? { "X-Session-Token": sessionToken } : ({} as Record<string, string>)),
    [sessionToken]
  );

  const loadQueue = useCallback(async () => {
    if (!sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/manual-review-queue?limit=200`, {
        headers: { ...authHeaders() },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setIncidents(data.incidents || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [sessionToken, authHeaders]);

  useEffect(() => {
    if (sessionToken) loadQueue();
  }, [sessionToken, loadQueue]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password }),
      });
      if (!r.ok) throw new Error("Invalid password");
      const data = await r.json();
      setSessionToken(data.session_token);
      localStorage.setItem("admin_session", data.session_token);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const updateEdit = (id: string, field: keyof ReviewIncident, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value || null },
    }));
  };

  const saveIncident = async (id: string) => {
    const payload = edits[id];
    if (!payload) return;
    const cleaned = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== undefined && v !== "")
    );
    if (Object.keys(cleaned).length === 0) {
      setError("No changes to save");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(cleaned),
      });
      if (!r.ok) {
        const detail = await r.json().catch(() => ({}));
        throw new Error(detail.detail || `HTTP ${r.status}`);
      }
      const data = await r.json();
      setSuccess(`Saved ${id} — locked: ${data.locked_fields.join(", ")}`);
      setEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await loadQueue();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const triggerSweep = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/api/admin/data-quality/sweep-now`, {
        method: "POST",
        headers: { ...authHeaders() },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setSuccess(
        `Sweep complete: scanned ${data.scanned}, requeued ${data.requeued_for_reenrichment}, flagged ${data.flagged_for_manual_review}`
      );
      await loadQueue();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sweep failed");
    } finally {
      setLoading(false);
    }
  };

  if (!sessionToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <form onSubmit={handleLogin} className="bg-card border border-border rounded-lg p-6 w-96 space-y-4">
          <h1 className="text-xl font-semibold">Admin Login</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-background border border-border rounded px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded py-2 font-medium disabled:opacity-50"
          >
            {loading ? "..." : "Login"}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Manual Review Queue</h1>
          <p className="text-sm text-muted-foreground">
            Incidents flagged after 3 failed re-enrichment attempts. Edit fields inline; saved fields are locked from re-enrichment.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin" className="text-sm bg-secondary px-3 py-1.5 rounded">
            ← Admin
          </Link>
          <button
            onClick={triggerSweep}
            disabled={loading}
            className="text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded disabled:opacity-50"
          >
            Run sweep now
          </button>
          <button
            onClick={loadQueue}
            disabled={loading}
            className="text-sm bg-secondary px-3 py-1.5 rounded disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm bg-red-950/30 border border-red-900 rounded px-3 py-2">{error}</p>}
      {success && <p className="text-green-400 text-sm bg-green-950/30 border border-green-900 rounded px-3 py-2">{success}</p>}

      {incidents.length === 0 && !loading && (
        <p className="text-muted-foreground text-sm py-8 text-center">
          No incidents in the manual review queue. The data-quality sweeper either hasn&apos;t found any bad rows, or auto re-enrichment fixed them.
        </p>
      )}

      <div className="space-y-3">
        {incidents.map((inc) => {
          const e = edits[inc.incident_id] || {};
          return (
            <div key={inc.incident_id} className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground font-mono">{inc.incident_id}</p>
                  <p className="font-medium truncate" title={inc.title || ""}>
                    {inc.title || "(no title)"}
                  </p>
                  {inc.primary_url && (
                    <a
                      href={inc.primary_url}
                      target="_blank"
                      rel="noopener"
                      className="text-xs text-blue-400 hover:underline truncate block"
                    >
                      {inc.primary_url}
                    </a>
                  )}
                </div>
                <div className="text-right text-xs space-y-1 shrink-0">
                  <p>
                    <span className="text-muted-foreground">attempts:</span> {inc.re_enrich_attempts ?? 0}
                  </p>
                  {inc.manually_edited === 1 && (
                    <p className="text-amber-400">
                      locked: {inc.manually_edited_fields.join(", ") || "none"}
                    </p>
                  )}
                </div>
              </div>

              {inc.manual_review_reason && (
                <p className="text-xs text-amber-400 bg-amber-950/30 border border-amber-900/50 rounded px-2 py-1">
                  {inc.manual_review_reason}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {EDITABLE_FIELDS.map((field) => {
                  const current = inc[field] as string | null;
                  const editValue = (e[field] as string | undefined) ?? current ?? "";
                  const isLocked = inc.manually_edited_fields.includes(field as string);
                  return (
                    <label key={field} className="text-xs space-y-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {field}
                        {isLocked && <span className="text-amber-400">🔒</span>}
                      </span>
                      <input
                        value={editValue}
                        onChange={(ev) => updateEdit(inc.incident_id, field, ev.target.value)}
                        placeholder={current || "(empty)"}
                        className="w-full bg-background border border-border rounded px-2 py-1 text-sm font-mono"
                      />
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => saveIncident(inc.incident_id)}
                  disabled={loading || !edits[inc.incident_id]}
                  className="text-sm bg-primary text-primary-foreground px-4 py-1.5 rounded disabled:opacity-40"
                >
                  Save changes
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
