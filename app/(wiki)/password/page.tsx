import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { isAdmin, requireEditor } from "@/lib/auth";
import { canAddEditors } from "@/lib/editors-store";

export const metadata = { title: "Change Password" };

export default async function PasswordPage() {
  const email = await requireEditor("/password");
  const canChange = !(await isAdmin(email)) || canAddEditors();

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Change password</h1>
        <p className="mt-1 text-sm text-muted-foreground">{email}</p>
      </div>
      {canChange ? (
        <ChangePasswordForm />
      ) : (
        <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
          Redis isn&apos;t set up here, so use <code>npm run add-editor</code>{" "}
          instead.
        </p>
      )}
    </div>
  );
}
