import { cn, statusColors } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-background/85 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-foreground backdrop-blur",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          statusColors[status] || "bg-muted-foreground",
        )}
      />
      {status.toLowerCase()}
    </span>
  );
}
