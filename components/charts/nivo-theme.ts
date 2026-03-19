import type { PartialTheme } from "@nivo/theming";

export const nivoTheme: PartialTheme = {
  background: "transparent",
  text: { fontSize: 11, fill: "#e4e4e7" },
  axis: {
    ticks: { text: { fill: "#71717a", fontSize: 11 } },
    legend: { text: { fill: "#a1a1aa", fontSize: 12 } },
  },
  grid: { line: { stroke: "#27272a" } },
  legends: { text: { fill: "#a1a1aa", fontSize: 11 } },
  tooltip: {
    container: {
      background: "#111118",
      border: "1px solid #27272a",
      borderRadius: "8px",
      color: "#e4e4e7",
      fontSize: 12,
      padding: "8px 12px",
    },
  },
  labels: { text: { fill: "#e4e4e7", fontSize: 11 } },
};

export const NIVO_COLORS = [
  "#06b6d4",
  "#8b5cf6",
  "#f43f5e",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
  "#a855f7",
  "#f97316",
  "#64748b",
];
