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
