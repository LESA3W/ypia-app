"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "next-themes";
import * as Tooltip from "@radix-ui/react-tooltip";
import { NAV_ITEMS } from "./nav-items";
import { LanguageSwitcher } from "./language-switcher";
import { ModelSwitcher } from "./model-switcher";
import { MobileBar } from "./mobile-bar";
import { UnreadProvider, useUnread, NotifBadge } from "./unread";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { apiMutate } from "@/lib/fetcher";

// footer nav (mobile): no Logs, Chat centered
const FOOTER_HREFS = ["/", "/memory", "/chat", "/reminders", "/settings"];

function ChatUnreadBadge() {
  const { unread } = useUnread();
  return <NotifBadge count={unread} />;
}

// iOS-style drawer easing (Emil): strong, settled, never sluggish.
const EASE = [0.32, 0.72, 0, 1] as const;

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  // reopening the app after it was backgrounded for a while → land on the chat
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (hiddenAt && Date.now() - hiddenAt > 10 * 60 * 1000) {
        hiddenAt = 0;
        if (!location.pathname.startsWith("/chat")) router.push("/chat");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [router]);

  // restore the saved preference after mount, then enable animation so the
  // initial state snaps instantly instead of animating open->closed on load.
  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebarCollapsed") === "1");
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebarCollapsed", next ? "1" : "0");
      return next;
    });
  }

  async function logout() {
    await apiMutate("/api/logout", "POST").catch(() => {});
    window.location.href = "/login";
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const onChat = pathname.startsWith("/chat");

  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const wordmarkSrc = dark ? "/wordmark.png" : "/wordmark-light.png";
  const markSrc = dark ? "/logo-dark.png" : "/logo-light.png";

  return (
    <UnreadProvider>
    <div className={cn("flex", onChat ? "fixed inset-0 overflow-hidden" : "min-h-screen")}>
      <Tooltip.Provider delayDuration={0} skipDelayDuration={0}>
        {/* Sidebar (md+) — collapsible */}
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 72 : 224 }}
          transition={{ duration: ready ? 0.34 : 0, ease: EASE }}
          className="relative z-20 hidden shrink-0 md:flex md:flex-col md:border-r md:border-line md:bg-surface/60 md:backdrop-blur-xl"
        >
          {/* edge toggle */}
          <button
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute -right-3 top-7 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-muted shadow-lg shadow-black/30 transition-all duration-150 hover:text-foreground hover:bg-surface-3 active:scale-90"
          >
            <Icon
              name="chevronDown"
              size={14}
              className={cn("transition-transform duration-300", collapsed ? "-rotate-90" : "rotate-90")}
            />
          </button>

          <div className="flex h-full flex-col overflow-hidden">
            {/* logo */}
            <div className="flex h-[52px] items-center px-4 pt-4">
              <Link href="/" aria-label="ypia — accueil" className="inline-flex items-center transition-opacity hover:opacity-80">
                <AnimatePresence mode="wait" initial={false}>
                  {collapsed ? (
                    <motion.img
                      key={`mark-${dark}`}
                      src={markSrc}
                      alt="ypia"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.18 }}
                      className="h-9 w-9 rounded-xl ring-1 ring-line-strong/40"
                    />
                  ) : (
                    <motion.img
                      key={`word-${dark}`}
                      src={wordmarkSrc}
                      alt="ypia"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.18 }}
                      className="h-9 w-auto"
                    />
                  )}
                </AnimatePresence>
              </Link>
            </div>

            {/* slogan + model (expanded only) */}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  key="top-extras"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.24, ease: EASE }}
                  className="overflow-hidden px-4"
                >
                  <p className="mt-1 text-[10px] leading-tight text-muted-2">Your personal intelligent assistant.</p>
                  <div className="mt-3">
                    <ModelSwitcher />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* nav */}
            <nav className="flex-1 px-3 py-3">
              {NAV_ITEMS.map((item) => (
                <SideLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={t(item.key)}
                  active={isActive(item.href)}
                  collapsed={collapsed}
                />
              ))}
            </nav>

            {/* language (expanded only) */}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  key="lang"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.24, ease: EASE }}
                  className="overflow-hidden px-3"
                >
                  <LanguageSwitcher />
                </motion.div>
              )}
            </AnimatePresence>

            {/* logout */}
            <div className="px-3 pb-3 pt-1">
              <RailButton icon="logout" label={t("logout")} collapsed={collapsed} onClick={logout} />
            </div>
          </div>
        </motion.aside>
      </Tooltip.Provider>

      {/* Main */}
      <div className={cn("flex min-w-0 flex-1 flex-col md:pb-0", onChat ? "pwa-main-pad-chat min-h-0" : "pwa-main-pad")}>
        <MobileBar />
        <main className={cn("mx-auto w-full max-w-5xl flex-1 px-4 md:px-8", onChat ? "flex min-h-0 flex-col py-0 md:py-8" : "py-5 md:py-8")}>
          {children}
        </main>
      </div>

      {/* Bottom nav (mobile) — floating liquid-glass pill (hidden in chat) */}
      {!onChat && (
      <nav className="pwa-bottom-float fixed inset-x-0 z-40 px-3 md:hidden">
        <div className="liquid-glass mx-auto flex max-w-md items-stretch justify-between gap-0.5 rounded-[26px] p-1.5">
          {FOOTER_HREFS.map((href) => {
            const item = NAV_ITEMS.find((i) => i.href === href);
            if (!item) return null;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-medium transition-all duration-200 active:scale-95",
                  active ? "bg-copper/20 text-copper-bright" : "text-muted-2 hover:text-foreground"
                )}
              >
                <span className="relative">
                  <Icon name={item.icon} size={26} />
                  {item.href === "/chat" && <ChatUnreadBadge />}
                </span>
                {t(item.key)}
              </Link>
            );
          })}
        </div>
      </nav>
      )}
    </div>
    </UnreadProvider>
  );
}

function tipWrap(collapsed: boolean, label: string, node: React.ReactNode) {
  if (!collapsed) return node;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{node}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={10}
          className="z-50 rounded-md border border-line-strong bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-xl shadow-black/40 fade-up"
        >
          {label}
          <Tooltip.Arrow className="fill-[var(--surface-2)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function SideLink({
  href,
  icon,
  label,
  active,
  collapsed,
}: {
  href: string;
  icon: IconName;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "mb-1 flex h-10 items-center rounded-lg px-3 text-sm transition-all duration-200",
        active
          ? "bg-copper/15 text-copper-bright ring-1 ring-inset ring-copper/25 shadow-[0_0_24px_-12px_var(--copper-bright)]"
          : "text-muted hover:bg-surface-2 hover:text-foreground"
      )}
    >
      <Icon name={icon} size={18} className="shrink-0" />
      <span className={cn("ml-3 whitespace-nowrap transition-opacity duration-200", collapsed && "pointer-events-none opacity-0")}>
        {label}
      </span>
    </Link>
  );
  return tipWrap(collapsed, label, link);
}

function RailButton({
  icon,
  label,
  collapsed,
  onClick,
}: {
  icon: IconName;
  label: string;
  collapsed: boolean;
  onClick: () => void;
}) {
  const btn = (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-full items-center rounded-lg px-3 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      <Icon name={icon} size={18} className="shrink-0" />
      <span className={cn("ml-3 whitespace-nowrap transition-opacity duration-200", collapsed && "pointer-events-none opacity-0")}>
        {label}
      </span>
    </button>
  );
  return tipWrap(collapsed, label, btn);
}
