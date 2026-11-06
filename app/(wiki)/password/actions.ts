"use server";

import { checkCredentials, hashPassword, requireEditor } from "@/lib/auth";
import { getAddedEditor, saveAddedEditor } from "@/lib/editors-store";
import { passwordProblem } from "@/lib/password";

export type ChangePasswordState = { error?: string; message?: string } | null;

export async function changePassword(
  _previous: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const email = await requireEditor("/password");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");

  // Admins aren't stored in Redis, so there's nothing here to update.
  const editor = await getAddedEditor(email);
  if (!editor)
    return { error: "This account's password can't be changed here." };

  if (!(await checkCredentials(email, current))) {
    return { error: "Your current password is incorrect." };
  }
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (next !== String(formData.get("confirm") ?? "")) {
    return { error: "The new passwords don't match." };
  }

  await saveAddedEditor({ ...editor, hash: await hashPassword(next) });
  return { message: "Password changed." };
}
