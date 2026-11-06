"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePassword } from "@/app/(wiki)/password/actions";

const FIELDS = [
  { name: "current", label: "Current password", auto: "current-password" },
  { name: "next", label: "New password", auto: "new-password" },
  { name: "confirm", label: "Confirm new password", auto: "new-password" },
];

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);

  return (
    <form action={action} className="space-y-4">
      {FIELDS.map((field) => (
        <div key={field.name} className="space-y-1.5">
          <label htmlFor={field.name} className="text-sm font-medium">
            {field.label}
          </label>
          <Input
            id={field.name}
            name={field.name}
            type="password"
            autoComplete={field.auto}
            required
          />
        </div>
      ))}
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.message && (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Change password
      </Button>
    </form>
  );
}
