import Link from "next/link";
import { PlugZap, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findTarget, formatDuration } from "@/lib/charging/robots";
import { getSession } from "@/lib/charging/store";
import { checkUnplugToken } from "@/lib/charging/remind";
import { stopFromEmail } from "../actions";

export const dynamic = "force-dynamic";

async function loadSession(s: string, t: string) {
  const session = s && t && checkUnplugToken(s, t) ? await getSession(s) : null;
  const target = session ? findTarget(session.robotId) : null;
  return session && target
    ? { session, target, elapsed: Date.now() - session.start }
    : null;
}

// Opened from the reminder email. Stopping the timer takes a button press
// rather than happening on page load, because email scanners open links on
// their own.
export default async function UnplugPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; t?: string }>;
}) {
  const { s = "", t = "" } = await searchParams;
  const found = await loadSession(s, t);

  return (
    <div className="mx-auto max-w-md space-y-5 rounded-xl border bg-card p-6 shadow-sm">
      {!found ? (
        <p className="text-muted-foreground">
          This link isn&apos;t valid. Open the{" "}
          <Link href="/charging" className="text-primary underline">
            charging page
          </Link>{" "}
          to update the robot.
        </p>
      ) : found.session.end !== null ? (
        <>
          <h1 className="text-xl font-semibold">{found.target.name}</h1>
          <p className="text-muted-foreground">
            Already marked as{" "}
            {found.target.kind === "docked" ? "plugged back in" : "unplugged"}.
            Thanks!
          </p>
          <Button asChild variant="outline">
            <Link href="/charging">Go to the charging page</Link>
          </Button>
        </>
      ) : found.target.kind === "docked" ? (
        <>
          <h1 className="text-xl font-semibold">{found.target.name}</h1>
          <p className="text-muted-foreground">
            Taken off the charger by {found.session.pluggedInBy}{" "}
            {formatDuration(found.elapsed)} ago. Have you plugged it back in?
          </p>
          <form action={stopFromEmail}>
            <input type="hidden" name="s" value={s} />
            <input type="hidden" name="t" value={t} />
            <Button type="submit" className="w-full">
              <PlugZap />
              Yes, it&apos;s plugged back in
            </Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold">{found.target.name}</h1>
          <p className="text-muted-foreground">
            Plugged in by {found.session.pluggedInBy}{" "}
            {formatDuration(found.elapsed)} ago. Have you unplugged it?
          </p>
          <form action={stopFromEmail}>
            <input type="hidden" name="s" value={s} />
            <input type="hidden" name="t" value={t} />
            <Button type="submit" className="w-full">
              <Unplug />
              Yes, mark as unplugged
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
