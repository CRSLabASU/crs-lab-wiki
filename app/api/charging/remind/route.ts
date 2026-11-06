import { verifyQstashSignature } from "@/lib/charging/schedule";
import { sendReminder } from "@/lib/charging/remind";

// QStash calls this when a charge time is up (see lib/charging/schedule.ts).
export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyQstashSignature(request.headers.get("upstash-signature"), body)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const { sessionId } = JSON.parse(body) as { sessionId?: string };
  if (typeof sessionId !== "string") {
    return new Response("Missing sessionId", { status: 400 });
  }

  // Errors throw a 500, so QStash retries the call.
  const result = await sendReminder(sessionId);
  return Response.json({ result });
}
