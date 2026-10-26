import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/icon";

export function EmptyState({ message, icon = "inbox" }: { message: string; icon?: IconName }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-10 text-center">
      <Icon name={icon} size={28} className="text-muted-2" strokeWidth={1.25} />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-error-text">
      <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function StatLabel({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("text-[11px] font-medium uppercase tracking-[0.12em] text-muted", className)}
      {...props}
    />
  );
}
