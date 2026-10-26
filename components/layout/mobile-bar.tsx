"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { NAV_ITEMS } from "./nav-items";
import { LanguageSwitcher } from "./language-switcher";
import { ModelSwitcher } from "./model-switcher";
import { useUnread, NotifBadge } from "./unread";
import { Icon } from "@/components/ui/icon";
import { fetcher, apiMutate } from "@/lib/fetcher";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function MobileBar() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const onChat = pathname.startsWith("/chat");

  const [open, setOpen] = useState(false);
  const [botPhotoErr, setBotPhotoErr] = useState(false);
  const { unread } = useUnread();
  const profile = useSWR<{ name: string }>("/api/memory/profile", fetcher);
  const avatar = useSWR<{ avatar: string | null }>("/api/memory/profile/avatar", fetcher);
  const botProfile = useSWR<{ name: string }>(onChat ? "/api/dashboard/telegram" : null, fetcher);

  async function logout() {
    await apiMutate("/api/logout", "POST").catch(() => {});
    window.location.href = "/login";
  }

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  const name = profile.data?.name || "";
  const avatarUrl = avatar.data?.avatar;
  const botName = botProfile.data?.name || "";

  // ── Chat conversation header: back · bot name/“bot” · bot avatar → edit bot ──
  if (onChat) {
    return (
      <header className="pwa-header fixed inset-x-0 top-0 z-30 flex items-center gap-2.5 md:hidden">
        <div aria-hidden className="mobile-scrim pointer-events-none absolute inset-0 -z-10" />
        <button
          onClick={goBack}
          aria-label={tc("back")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-foreground/[0.06] text-foreground active:scale-90"
        >
          <Icon name="arrowLeft" size={22} />
        </button>
        <Link
          href="/settings"
          className="liquid-glass flex min-w-0 flex-1 flex-col items-center justify-center rounded-full px-5 py-1.5 text-center active:scale-[0.98]"
        >
          <span className="w-full truncate font-display text-base font-bold leading-tight text-foreground">
            {botName || t("chat")}
          </span>
          <span className="text-[11px] leading-tight text-muted-2">bot</span>
        </Link>
        <Link
          href="/settings"
          aria-label={t("settings")}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-3 active:scale-95"
        >
          {!botPhotoErr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/api/dashboard/telegram/photo" alt="" className="h-full w-full object-cover" onError={() => setBotPhotoErr(true)} />
          ) : (
            <Icon name="user" size={18} className="text-foreground" />
          )}
        </Link>
      </header>
    );
  }

  // ── Default header: logo · search · account ──
  return (
    <header className="pwa-header fixed inset-x-0 top-0 z-30 flex items-center gap-2.5 md:hidden">
      <div aria-hidden className="mobile-scrim pointer-events-none absolute inset-0 -z-10" />

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Trigger
          aria-label={tc("account")}
          className="liquid-glass relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full active:scale-95"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : name ? (
            <span className="text-sm font-semibold text-foreground">{initials(name)}</span>
          ) : (
            <Icon name="user" size={18} className="text-foreground" />
          )}
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <DialogPrimitive.Content className="pwa-safe-top liquid-glass fixed inset-x-0 top-0 z-50 rounded-b-3xl px-4 pb-4 shadow-2xl fade-up">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-surface-3">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[11px] font-semibold text-foreground">{initials(name) || "?"}</span>
                  )}
                </span>
                <span className="text-sm font-medium">{name || tc("account")}</span>
              </span>
              <DialogPrimitive.Close aria-label="Close" className="text-muted hover:text-foreground">
                <Icon name="close" size={16} />
              </DialogPrimitive.Close>
            </div>
            <DialogPrimitive.Title className="sr-only">{tc("account")}</DialogPrimitive.Title>
            <div className="space-y-2">
              <ModelSwitcher />
              <LanguageSwitcher />
              <button
                onClick={logout}
                className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-3 hover:text-foreground"
              >
                <Icon name="logout" size={18} />
                {t("logout")}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <MobileSearch placeholder={tc("search")} />

      <Link
        href="/chat"
        aria-label={t("chat")}
        className="liquid-glass relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground active:scale-95"
      >
        <Icon name="chat" size={20} />
        <NotifBadge count={unread} />
      </Link>
    </header>
  );
}

function MobileSearch({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const tNav = useTranslations("nav");
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);

  const items = NAV_ITEMS.map((i) => ({ ...i, label: tNav(i.key) }));
  const query = q.trim().toLowerCase();
  const results = query ? items.filter((i) => i.label.toLowerCase().includes(query)) : [];
  const show = focused && query.length > 0 && results.length > 0;

  function go(href: string) {
    setQ("");
    setFocused(false);
    router.push(href);
  }

  return (
    <div className="relative flex-1">
      <div className="liquid-glass flex h-11 items-center gap-2 rounded-full px-3.5">
        <Icon name="search" size={16} className="shrink-0 text-muted-2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) go(results[0].href);
            if (e.key === "Escape") {
              setQ("");
              setFocused(false);
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-2"
        />
      </div>
      {show && (
        <div className="liquid-glass absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl p-1 fade-up">
          {results.map((r) => (
            <button
              key={r.href}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(r.href)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-3"
            >
              <Icon name={r.icon} size={16} className="text-muted" />
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
