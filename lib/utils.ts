import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const statusColors: Record<string, string> = {
  OPERATIONAL: "bg-green-600",
  "UNDER ASSESSMENT": "bg-amber-500",
  BROKEN: "bg-red-600",
  MAINTENANCE: "bg-orange-500",
  DEGRADED: "bg-yellow-500",
  DOWN: "bg-red-600",
};

export const statusLabels: Record<string, string> = {
  OPERATIONAL: "Operational",
  "UNDER ASSESSMENT": "Under assessment",
  BROKEN: "Broken",
  MAINTENANCE: "Maintenance",
  DEGRADED: "Degraded",
  DOWN: "Down",
};

/** "2026-09-15" -> "Sep 15, 2026". Formatted in UTC so server and browser agree. */
export function formatDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
