"use client";

import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  icon,
  onRefresh,
  isValidating,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  onRefresh?: () => void;
  isValidating?: boolean;
  action?: React.ReactNode;
}) {
  const t = useTranslations("overview");
  return (
    <header className="mb-5 flex items-end justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2 text-copper-bright">
            <Icon name={icon} size={20} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-[28px]">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            onClick={onRefresh}
            aria-label={t("refresh")}
            className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3.5 py-2 text-sm text-foreground transition-all duration-150 hover:border-line-strong hover:bg-surface-3 active:scale-[0.97]"
          >
            <Icon name="refresh" size={16} className={cn(isValidating && "spin")} />
            <span className="hidden sm:inline">{t("refresh")}</span>
          </button>
        )}
        {action}
      </div>
    </header>
  );
}
