"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const OPTIONS: { value: string; labelKey: string; icon: IconName }[] = [
  { value: "dark", labelKey: "dark", icon: "power" },
  { value: "light", labelKey: "light", icon: "bolt" },
];

export function AppearanceCard() {
  const t = useTranslations("settings");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? theme ?? "dark" : "dark";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("appearance")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {OPTIONS.map((o) => {
            const active = current === o.value;
            return (
              <button
                key={o.value}
                onClick={() => setTheme(o.value)}
                aria-pressed={active}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all active:scale-[0.98]",
                  active
                    ? "border-copper/40 bg-copper/15 text-copper-bright ring-1 ring-inset ring-copper/25"
                    : "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-foreground"
                )}
              >
                <Icon name={o.icon} size={16} />
                {t(o.labelKey)}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
