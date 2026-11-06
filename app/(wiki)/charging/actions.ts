"use server";

import { redirect } from "next/navigation";
import { findTarget, type ChargeSession } from "@/lib/charging/robots";
import {
  activeSessionId,
  endSession,
  getSession,
  listSessions,
  startSession,
} from "@/lib/charging/store";
import { scheduleReminder } from "@/lib/charging/schedule";
import { checkUnplugToken } from "@/lib/charging/remind";

type Result = { sessions: ChargeSession[]; error?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function getSessions(): Promise<ChargeSession[]> {
  return listSessions();
}

/** Battery robots: plugged in. Docked robots: taken off the charger. */
export async function startTimer(
  robotId: string,
  email: string,
): Promise<Result> {
  const target = findTarget(robotId);
  const address = email.trim().toLowerCase();
  if (!target)
    return { sessions: await listSessions(), error: "Unknown robot." };
  if (!EMAIL.test(address) || address.length > 254) {
    return { sessions: await listSessions(), error: "Enter a valid email." };
  }

  const session = await startSession(robotId, address);
  if (!session) {
    return {
      sessions: await listSessions(),
      error:
        target.kind === "docked"
          ? "Someone already marked this robot as off the charger."
          : "Someone already marked this robot as plugged in.",
    };
  }
  try {
    await scheduleReminder(session.id, target.targetMinutes * 60_000);
  } catch (err) {
    // Don't leave a timer running with no reminder coming.
    await endSession(session.id);
    console.error(err);
    return {
      sessions: await listSessions(),
      error: "Couldn't schedule the reminder email. Try again.",
    };
  }
  return { sessions: await listSessions() };
}

/** Battery robots: unplugged. Docked robots: plugged back in. */
export async function stopTimer(robotId: string): Promise<Result> {
  const id = await activeSessionId(robotId);
  if (id) await endSession(id);
  return { sessions: await listSessions() };
}

/** The confirm button on the page linked from the reminder email. */
export async function stopFromEmail(formData: FormData) {
  const sessionId = String(formData.get("s") ?? "");
  const token = String(formData.get("t") ?? "");
  if (!checkUnplugToken(sessionId, token)) redirect("/charging");
  const session = await getSession(sessionId);
  if (session) await endSession(sessionId);
  redirect("/charging");
}
