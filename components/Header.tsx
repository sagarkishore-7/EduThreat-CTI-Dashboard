"use client";

import { usePathname } from "next/navigation";
import { Search, Bell, RefreshCw } from "lucide-react";
import { useState } from "react";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/incidents": "Incidents",
  "/map": "Global Map",
  "/attacks": "Attack Analysis",
  "/ransomware": "Ransomware Tracking",
  "/threat-actors": "Threat Actors",
  "/analytics": "Analytics",
};

export function Header() {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");

  const title = pathname.startsWith("/incidents/")
    ? "Incident Details"
    : pageTitles[pathname] || "EduThreat-CTI";

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-xs text-muted-foreground">
          Education Sector Cyber Threat Intelligence
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Refresh */}
        <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
          <RefreshCw className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Notifications */}
        <button className="p-2 hover:bg-secondary rounded-lg transition-colors relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
          A
        </div>
      </div>
    </header>
  );
}

