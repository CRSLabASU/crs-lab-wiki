import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { isAdmin, requireEditor } from "@/lib/auth";

export const metadata = { title: "Change Password" };

export default async function PasswordPage() {
  const email = await requireEditor("/password");
  const admin = await isAdmin(email);

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Change password</h1>
        <p className="mt-1 text-sm text-muted-foreground">{email}</p>
      </div>
      {admin ? (
        <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
          Admin passwords can&apos;t be changed here. Run{" "}
          <code>npm run add-editor</code>, then update WIKI_EDITORS in Vercel
          and redeploy.
        </p>
      ) : (
        <ChangePasswordForm />
      )}
    </div>
  );
}
