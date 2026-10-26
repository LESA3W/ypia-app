"use client";

import useSWR from "swr";
import { useTranslations } from "next-intl";
import { fetcher } from "@/lib/fetcher";
import { Icon } from "@/components/ui/icon";

/** Deep link that opens the bot conversation in Telegram. Hidden until resolved. */
export function OpenInTelegram() {
  const tc = useTranslations("common");
  const { data } = useSWR<{ url: string | null }>("/api/dashboard/bot-link", fetcher);
  if (!data?.url) return null;
  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex shrink-0 items-center gap-2 rounded-md border border-line bg-surface-2 px-3.5 py-2 text-sm text-muted transition-colors hover:border-line-strong hover:text-foreground"
    >
      <Icon name="external" size={16} />
      {tc("openInTelegram")}
    </a>
  );
}
