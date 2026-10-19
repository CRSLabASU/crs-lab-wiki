"use server";

import { redirect } from "next/navigation";
import { checkCredentials, endSession, startSession } from "@/lib/auth";

function safeReturnPath(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  // Only allow same-site paths, never "//evil.com" or absolute URLs.
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function login(formData: FormData) {
  const next = safeReturnPath(formData.get("next"));
  const email = await checkCredentials(
    String(formData.get("email") ?? ""),
    String(formData.get("password") ?? ""),
  );
  if (!email) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }
  await startSession(email);
  redirect(next);
}

export async function logout() {
  await endSession();
  redirect("/");
}
