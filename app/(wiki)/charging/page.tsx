import type { Metadata } from "next";
import { ChargingClient } from "@/components/charging/ChargingClient";
import { listSessions } from "@/lib/charging/store";

export const metadata: Metadata = {
  title: "Charging · CRS Robot Wiki",
};

export const dynamic = "force-dynamic";

export default async function ChargingPage() {
  return <ChargingClient initialSessions={await listSessions()} />;
}
