"use server";

import { revalidatePath } from "next/cache";
import { hashPassword, isAdmin, requireAdmin } from "@/lib/auth";
import {
  canAddEditors,
  getAddedEditor,
  removeAddedEditor,
  saveAddedEditor,
} from "@/lib/editors-store";
import { passwordProblem } from "@/lib/password";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AddEditorState = {
  error?: string;
  message?: string;
  email?: string;
} | null;

/** Adds an editor, or sets a new password if the email is already an editor. */
export async function addEditor(
  _previous: AddEditorState,
  formData: FormData,
): Promise<AddEditorState> {
  const admin = await requireAdmin("/editors");

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!canAddEditors()) {
    return { error: "Redis isn't set up, so editors can't be added here." };
  }
  if (!EMAIL.test(email) || email.length > 254) {
    return { error: "Enter a valid email.", email };
  }
  const problem = passwordProblem(password);
  if (problem) return { error: problem, email };
  if (await isAdmin(email)) {
    return {
      error: `${email} is an admin. Admin passwords are changed with npm run add-editor.`,
      email,
    };
  }

  const existing = await getAddedEditor(email);
  await saveAddedEditor({
    email,
    hash: await hashPassword(password),
    addedBy: existing?.addedBy ?? admin,
    addedAt: existing?.addedAt ?? Date.now(),
  });
  revalidatePath("/editors");
  return {
    message: existing
      ? `Set a new password for ${email}.`
      : `Added ${email}. Send them the temporary password.`,
  };
}

export async function removeEditor(email: string) {
  await requireAdmin("/editors");
  await removeAddedEditor(email);
  revalidatePath("/editors");
}
