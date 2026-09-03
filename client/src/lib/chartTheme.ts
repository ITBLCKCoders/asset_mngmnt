import { useTheme } from "@/hooks/use-theme";

export const STATUS_COLORS_LIGHT = {
  pending: "#f59e0b",
  inProgress: "#2563eb",
  completed: "#16a34a",
  overdue: "#dc2626",
};

export const STATUS_COLORS_DARK = {
  pending: "#fbbf24",
  inProgress: "#60a5fa",
  completed: "#4ade80",
  overdue: "#f87171",
};

export const CATEGORICAL_LIGHT = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

export const CATEGORICAL_DARK = [
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#a78bfa",
  "#f472b6",
  "#22d3ee",
  "#fb923c",
];

export interface ChartTheme {
  gridOpacity: number;
  tooltip: {
    backgroundColor: string;
    border: string;
  };
  axisColor: string;
  tickColor: string;
}

export function getChartTheme(isDark: boolean): ChartTheme {
  return {
    gridOpacity: isDark ? 0.22 : 0.58,
    tooltip: {
      backgroundColor: isDark ? "var(--chart-tooltip-bg)" : "var(--chart-tooltip-bg)",
      border: isDark ? "var(--chart-tooltip-border)" : "var(--chart-tooltip-border)",
    },
    axisColor: isDark ? "var(--chart-axis)" : "var(--chart-axis)",
    tickColor: isDark ? "var(--chart-tick)" : "var(--chart-tick)",
  };
}

export function useChartTheme() {
  const { theme } = useTheme();
  return getChartTheme(theme === "dark");
}