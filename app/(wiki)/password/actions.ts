"use server";

import {
  checkCredentials,
  hashPassword,
  isAdmin,
  requireEditor,
  setAdminPassword,
} from "@/lib/auth";
import {
  canAddEditors,
  getAddedEditor,
  saveAddedEditor,
} from "@/lib/editors-store";
import { passwordProblem } from "@/lib/password";

export type ChangePasswordState = { error?: string; message?: string } | null;

export async function changePassword(
  _previous: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const email = await requireEditor("/password");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");

  const admin = await isAdmin(email);
  const editor = admin ? null : await getAddedEditor(email);
  // Without Redis there's nowhere to keep an admin's new password.
  if (admin ? !canAddEditors() : !editor)
    return { error: "This account's password can't be changed here." };

  if (!(await checkCredentials(email, current))) {
    return { error: "Your current password is incorrect." };
  }
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (next !== String(formData.get("confirm") ?? "")) {
    return { error: "The new passwords don't match." };
  }

  if (editor) {
    await saveAddedEditor({ ...editor, hash: await hashPassword(next) });
  } else {
    await setAdminPassword(email, next);
  }
  return { message: "Password changed." };
}
