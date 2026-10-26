import type { IconName } from "@/components/ui/icon";

export const NAV_ITEMS: { href: string; key: string; icon: IconName }[] = [
  { href: "/", key: "overview", icon: "overview" },
  { href: "/memory", key: "memory", icon: "memory" },
  { href: "/reminders", key: "reminders", icon: "reminders" },
  { href: "/chat", key: "chat", icon: "chat" },
  { href: "/logs", key: "logs", icon: "logs" },
  { href: "/settings", key: "settings", icon: "settings" },
];
