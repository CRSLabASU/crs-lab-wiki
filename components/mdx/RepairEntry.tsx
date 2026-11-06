const badgeStyles: Record<string, string> = {
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  pending: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

const badgeLabels: Record<string, string> = {
  success: "Success",
  failed: "Failed",
  partial: "Partial",
  pending: "Pending",
};

export function RepairEntry({
  title,
  date,
  outcome,
  children,
}: {
  title: string;
  date: string;
  outcome: "success" | "failed" | "partial" | "pending";
  children: React.ReactNode;
}) {
  return (
    <div className="my-3 rounded-md border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between px-3 pt-2.5">
        <h3 className="text-sm font-semibold leading-snug">
          {title}
          <span className="ml-2 font-normal text-muted-foreground">
            — {date}
          </span>
        </h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyles[outcome]}`}
        >
          {badgeLabels[outcome]}
        </span>
      </div>
      <hr className="mx-3 mt-1.5 mb-0" />
      <div className="px-3 pt-2 pb-3 text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
}
