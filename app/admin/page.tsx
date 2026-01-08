"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ExportStats {
  total_incidents: number;
  enriched_incidents: number;
  education_related: number;
  total_sources: number;
  db_size_mb: number;
  last_updated: string;
}

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

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem("admin_session_token");
    if (token) {
      setSessionToken(token);
      setIsLoggedIn(true);
      fetchStats(token);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSessionToken(data.session_token);
        setIsLoggedIn(true);
        localStorage.setItem("admin_session_token", data.session_token);
        setSuccess("Login successful!");
        fetchStats(data.session_token);
      } else {
        setError(data.detail || "Login failed");
      }
    } catch (err) {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (sessionToken) {
      try {
        await fetch(`${API_URL}/api/admin/logout`, {
          method: "POST",
          headers: {
            "X-Session-Token": sessionToken,
          },
        });
      } catch (err) {
        // Ignore logout errors
      }
    }
    
    localStorage.removeItem("admin_session_token");
    setSessionToken(null);
    setIsLoggedIn(false);
    setStats(null);
    setSuccess("Logged out successfully");
  };

  const fetchStats = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/export/stats`, {
        headers: {
          "X-Session-Token": token,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else if (response.status === 401) {
        // Token expired
        handleLogout();
        setError("Session expired. Please login again.");
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const downloadFile = async (
    endpoint: string,
    filename: string,
    type: string
  ) => {
    if (!sessionToken) return;

    setDownloading(type);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/admin${endpoint}`, {
        headers: {
          "X-Session-Token": sessionToken,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSuccess(`Downloaded ${filename}`);
      } else if (response.status === 401) {
        handleLogout();
        setError("Session expired. Please login again.");
      } else {
        setError("Download failed");
      }
    } catch (err) {
      setError("Download failed. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  const triggerJob = async (jobType: string) => {
    if (!sessionToken) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/admin/scheduler/trigger/${jobType}`,
        {
          method: "POST",
          headers: {
            "X-Session-Token": sessionToken,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Job ${jobType} triggered successfully`);
        // Refresh stats after job
        fetchStats(sessionToken);
      } else {
        setError(data.detail || `Failed to trigger ${jobType}`);
      }
    } catch (err) {
      setError("Failed to trigger job. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const migrateDatabase = async () => {
    if (!sessionToken) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/admin/migrate-db`, {
        method: "POST",
        headers: {
          "X-Session-Token": sessionToken,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(
          `Database migrated successfully! ${data.incident_count} incidents copied to ${data.destination}`
        );
        // Refresh stats
        fetchStats(sessionToken);
      } else {
        setError(data.message || "Migration failed");
      }
    } catch (err) {
      setError("Migration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const uploadDatabase = async (file: File) => {
    if (!sessionToken) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/api/admin/upload-database`, {
        method: "POST",
        headers: {
          "X-Session-Token": sessionToken,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(
          `Database uploaded successfully! ${data.incident_count} incidents, ${data.enriched_count} enriched. Size: ${data.db_size_mb} MB`
        );
        // Refresh stats
        fetchStats(sessionToken);
      } else {
        setError(data.detail || data.message || "Upload failed");
      }
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fixIncidentDates = async (apply: boolean = false) => {
    if (!sessionToken) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${API_URL}/api/admin/fix-incident-dates?apply=${apply}`,
        {
          method: "POST",
          headers: {
            "X-Session-Token": sessionToken,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        if (apply) {
          setSuccess(
            `Fixed ${data.fixed} incident dates! ${data.skipped} skipped.`
          );
          // Refresh stats
          fetchStats(sessionToken);
        } else {
          setSuccess(
            `Dry run: Would fix ${data.fixed} incident dates. ${data.skipped} skipped. Click "Apply Fix" to actually update.`
          );
        }
      } else {
        setError(data.detail || data.message || "Fix failed");
      }
    } catch (err) {
      setError("Fix failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

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
              Access database exports and scheduler controls
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2 text-green-400">
                <Check className="w-4 h-4" />
                {success}
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
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Shield className="w-7 h-7 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">
            Database exports, scheduler controls, and system management
          </p>
        </div>
        
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2 text-green-400">
          <Check className="w-5 h-5" />
          {success}
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

      {/* Export Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          Database Export
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ExportButton
            label="Full Database"
            description="Download SQLite DB file"
            icon={Database}
            loading={downloading === "db"}
            onClick={() =>
              downloadFile(
                "/export/database",
                `eduthreat_${Date.now()}.db`,
                "db"
              )
            }
          />
          
          <ExportButton
            label="Full CSV Export"
            description="All enriched data as CSV"
            icon={FileDown}
            loading={downloading === "csv-full"}
            onClick={() =>
              downloadFile(
                "/export/csv/full?education_only=true",
                `eduthreat_full_${Date.now()}.csv`,
                "csv-full"
              )
            }
          />
          
          <ExportButton
            label="Incidents CSV"
            description="Incidents table"
            icon={FileDown}
            loading={downloading === "csv-incidents"}
            onClick={() =>
              downloadFile(
                "/export/csv/incidents?education_only=true",
                `eduthreat_incidents_${Date.now()}.csv`,
                "csv-incidents"
              )
            }
          />
          
          <ExportButton
            label="Sources CSV"
            description="All source attributions"
            icon={FileDown}
            loading={downloading === "csv-sources"}
            onClick={() =>
              downloadFile(
                "/export/csv/incident_sources?education_only=false",
                `eduthreat_sources_${Date.now()}.csv`,
                "csv-sources"
              )
            }
          />
        </div>
      </div>

      {/* Database Migration Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          Database Migration & Upload
        </h2>
        
        <p className="text-muted-foreground mb-4">
          Upload your local database file to Railway persistent storage, or migrate from repository.
        </p>
        
        <div className="space-y-4">
          {/* Upload Database File */}
          <div className="border border-border rounded-lg p-4 bg-secondary/30">
            <h3 className="font-medium mb-2">Upload Local Database</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Upload your local <code className="text-xs bg-background px-1 py-0.5 rounded">data/eduthreat.db</code> file
            </p>
            <label className="block">
              <input
                type="file"
                accept=".db"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    uploadDatabase(file);
                  }
                }}
                disabled={loading}
                className="hidden"
                id="db-upload"
              />
              <span
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors",
                  "bg-primary/10 hover:bg-primary/20 border border-primary/20",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {loading ? "Uploading..." : "Choose Database File (.db)"}
              </span>
            </label>
          </div>
          
          {/* Migrate from Repo */}
          <div className="border border-border rounded-lg p-4 bg-secondary/30">
            <h3 className="font-medium mb-2">Migrate from Repository</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Copy database from repository to <code className="text-xs bg-background px-1 py-0.5 rounded">/app/data</code>
            </p>
            <button
              onClick={migrateDatabase}
              disabled={loading}
              className={cn(
                "px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors",
                "bg-secondary hover:bg-secondary/80 border border-border",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {loading ? "Migrating..." : "Migrate from Repo"}
            </button>
          </div>
        </div>
      </div>

      {/* Scheduler Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-primary" />
          Scheduler Controls
        </h2>
        
        <p className="text-muted-foreground mb-4">
          Manually trigger ingestion and enrichment jobs
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <JobButton
            label="Run RSS Ingestion"
            description="Fetch latest RSS feeds"
            loading={loading}
            onClick={() => triggerJob("rss")}
          />
          
          <JobButton
            label="Run Weekly Ingestion"
            description="Full curated + news sources"
            loading={loading}
            onClick={() => triggerJob("weekly")}
          />
          
          <JobButton
            label="Run LLM Enrichment"
            description="Enrich unenriched incidents"
            loading={loading}
            onClick={() => triggerJob("enrich")}
          />
        </div>
      </div>

      {/* Data Maintenance Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Data Maintenance
        </h2>
        
        <p className="text-muted-foreground mb-4">
          Fix incident dates from timeline data. Updates incidents where the date matches the source published date or where the timeline shows an earlier date.
        </p>
        
        <div className="flex gap-4">
          <button
            onClick={() => fixIncidentDates(false)}
            disabled={loading}
            className={cn(
              "px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors",
              "bg-secondary hover:bg-secondary/80 border border-border",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Calendar className="w-4 h-4" />
            )}
            {loading ? "Checking..." : "Preview Fix (Dry Run)"}
          </button>
          
          <button
            onClick={() => fixIncidentDates(true)}
            disabled={loading}
            className={cn(
              "px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors",
              "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {loading ? "Fixing..." : "Apply Fix"}
          </button>
        </div>
      </div>

      {/* Environment Info */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Environment</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">API URL:</span>
            <code className="ml-2 text-primary">{API_URL}</code>
          </div>
          <div>
            <span className="text-muted-foreground">Session:</span>
            <code className="ml-2 text-green-400">Active</code>
          </div>
        </div>
      </div>
    </div>
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
      <div className="flex items-center gap-3 mb-2">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : (
          <Icon className="w-5 h-5 text-primary" />
        )}
        <span className="font-medium">{label}</span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
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
      <div className="flex items-center gap-3 mb-2">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : (
          <RefreshCw className="w-5 h-5 text-primary" />
        )}
        <span className="font-medium">{label}</span>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </button>
  );
}
