import { createHmac, timingSafeEqual } from "node:crypto";
import { findTarget, formatDuration } from "./robots";
import { getSession, recordReminder } from "./store";
import { scheduleReminder, siteUrl } from "./schedule";
import { sendEmail } from "./email";

// If the timer is still running after the first reminder, nag again every
// hour, up to MAX_REMINDERS emails in total.
const REPEAT_MS = 60 * 60_000;
const MAX_REMINDERS = 3;

function linkSecret() {
  const s = process.env.WIKI_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "WIKI_SESSION_SECRET must be set to a random string of at least 32 characters.",
    );
  }
  return s;
}

/** Token for the email's link, so only the emailed person can use it. */
export function unplugToken(sessionId: string) {
  return createHmac("sha256", linkSecret())
    .update(`unplug:${sessionId}`)
    .digest("base64url");
}

export function checkUnplugToken(sessionId: string, token: string) {
  const expected = Buffer.from(unplugToken(sessionId));
  const actual = Buffer.from(token);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Emails the person who started a robot's timer, if it's still running and due. */
export async function sendReminder(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session || session.end !== null) return "stopped";
  if (session.reminders >= MAX_REMINDERS) return "done";

  const target = findTarget(session.robotId);
  if (!target) return "unknown robot";

  const elapsed = Date.now() - session.start;
  const targetMs = target.targetMinutes * 60_000;
  // A minute of slack, in case the call arrives slightly early.
  if (elapsed < targetMs - 60_000) {
    await scheduleReminder(sessionId, targetMs - elapsed);
    return "early";
  }

  const link = `${siteUrl()}/charging/unplug?s=${sessionId}&t=${unplugToken(sessionId)}`;
  const docked = target.kind === "docked";
  const action = docked ? "plug it back in" : "unplug it";
  const last = session.reminders + 1 === MAX_REMINDERS;

  await sendEmail(
    session.pluggedInBy,
    `${session.reminders ? "Reminder: " : ""}Time to ${action}: ${target.name}`,
    [
      docked
        ? `${target.name} has been off its charger for ${formatDuration(elapsed)}. It should stay plugged in whenever nobody's using it, so please plug it back in once you're done.`
        : `${target.name} has been charging for ${formatDuration(elapsed)} (target ${formatDuration(targetMs)}). Please unplug it.`,
      "",
      `Once it's ${docked ? "back on the charger" : "unplugged"}, mark it on the wiki: ${link}`,
      "",
      last
        ? "This is the last reminder."
        : `We'll remind you again in an hour if it's still ${docked ? "off the charger" : "plugged in"}.`,
      "",
      "CRS Lab Wiki",
    ].join("\n"),
  );
  await recordReminder(sessionId);

  if (!last) await scheduleReminder(sessionId, REPEAT_MS);
  return "sent";
}
