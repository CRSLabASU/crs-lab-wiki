"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Client-only: the page is all live timers, so server-rendered times would never match.
export const ChargingClient = dynamic(
  () => import("./ChargingDashboard").then((m) => m.ChargingDashboard),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[640px] w-full rounded-xl" />,
  },
);
