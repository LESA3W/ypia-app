"use client";

import { useLocale } from "next-intl";
import { useState, useTransition } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { apiMutate } from "@/lib/fetcher";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n-config";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

// locale -> ISO country code for flag images (flagcdn renders everywhere, incl. Windows)
const FLAG: Record<Locale, string> = {
  en: "us",
  fr: "fr",
  de: "de",
  es: "es",
  it: "it",
  uk: "ua",
  ru: "ru",
  ja: "jp",
  zh: "cn",
  ko: "kr",
};

function Flag({ cc, className }: { cc: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${cc}.png`}
      srcSet={`https://flagcdn.com/w80/${cc}.png 2x`}
      alt=""
      width={22}
      height={16}
      className={cn("h-4 w-[22px] shrink-0 rounded-[3px] object-cover ring-1 ring-line", className)}
    />
  );
}

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await apiMutate("/api/dashboard/locale", "POST", { locale: next }).catch(() => {});
      window.location.reload();
    });
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger
        disabled={pending}
        className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-foreground transition-colors hover:border-line-strong hover:bg-surface-3 disabled:opacity-50"
      >
        <Flag cc={FLAG[locale]} />
        <span className="flex-1 truncate text-left">{LOCALE_LABELS[locale]}</span>
        <span className={cn("text-[10px] text-muted-2 transition-transform", open && "rotate-180")}><Icon name="chevronDown" size={12} /></span>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={6}
          className="z-50 max-h-[60vh] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-xl border border-line-strong bg-surface-2 p-1 shadow-2xl shadow-black/40 fade-up"
        >
          {LOCALES.map((l) => {
            const active = l === locale;
            return (
              <DropdownMenu.Item
                key={l}
                onSelect={() => choose(l)}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none transition-colors",
                  active ? "bg-copper/15 text-copper-bright" : "text-foreground hover:bg-surface-3"
                )}
              >
                <Flag cc={FLAG[l]} />
                <span className="flex-1 truncate">{LOCALE_LABELS[l]}</span>
                {active && <span className="text-xs text-copper-bright">✓</span>}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
