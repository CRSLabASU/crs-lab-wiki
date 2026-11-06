"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireEditor } from "@/lib/auth";
import { readPageAt, savePage, savesNeedRedeploy } from "@/lib/content";
import { validateMDX } from "@/lib/robots/validate";

function refresh(slug: string) {
  // Pages are pre-rendered; rebuild the layout too since the sidebar shows robot status.
  revalidatePath("/", "layout");
  revalidatePath(`/robots/${slug}`);
}

export async function saveRobot(
  slug: string,
  content: string,
  baseVersion: string,
): Promise<{ error: string } | { version: string }> {
  const email = await requireEditor(`/robots/${slug}/edit`);

  const validation = await validateMDX(content);
  if (!validation.ok) return { error: validation.error };

  let version: string;
  try {
    version = await savePage({
      slug,
      content,
      baseVersion,
      authorEmail: email,
      message: `wiki: edit ${slug}`,
    });
  } catch (err) {
    return { error: (err as Error).message };
  }

  // With the GitHub backend the live page only changes after Vercel redeploys,
  // so stay in the editor and tell the user instead of showing the old page.
  if (savesNeedRedeploy()) return { version };
  refresh(slug);
  redirect(`/robots/${slug}`);
}

export async function restoreRobot(slug: string, sha: string) {
  const email = await requireEditor(`/robots/${slug}/history`);

  try {
    const content = await readPageAt(slug, sha);
    const validation = await validateMDX(content);
    if (!validation.ok) return { error: validation.error };
    await savePage({
      slug,
      content,
      authorEmail: email,
      message: `wiki: restore ${slug} to ${sha.slice(0, 7)}`,
    });
  } catch (err) {
    return { error: (err as Error).message };
  }

  if (savesNeedRedeploy()) {
    // History reads from GitHub, so the restore shows up there right away.
    redirect(`/robots/${slug}/history?restored=1`);
  }
  refresh(slug);
  redirect(`/robots/${slug}`);
}
