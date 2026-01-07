"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Globe2,
  Shield,
  Users,
  BarChart3,
  AlertTriangle,
  Database,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Incidents", href: "/incidents", icon: FileText },
  { name: "Map View", href: "/map", icon: Globe2 },
  { name: "Attack Analysis", href: "/attacks", icon: AlertTriangle },
  { name: "Ransomware", href: "/ransomware", icon: Shield },
  { name: "Threat Actors", href: "/threat-actors", icon: Users },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight">EduThreat</span>
            <span className="text-primary font-bold">-CTI</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Status */}
      <div className="p-4 border-t border-border">
        <div className="bg-secondary rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500 status-pulse" />
            <span className="text-xs text-muted-foreground">System Status</span>
          </div>
          <p className="text-xs text-green-400">All systems operational</p>
        </div>
      </div>
    </aside>
  );
}

