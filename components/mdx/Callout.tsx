import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export function Callout({
  type = "note",
  title,
  children,
}: {
  type?: "note" | "warning" | "danger" | "tip";
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Alert
      variant={type === "danger" ? "destructive" : "default"}
      className="my-4"
    >
      <AlertTitle>{title ?? type.toUpperCase()}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
