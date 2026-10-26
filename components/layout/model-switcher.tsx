"use client";

import { useState } from "react";
import useSWR from "swr";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { fetcher, apiMutate } from "@/lib/fetcher";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

interface ModelOption {
  id: string;
  label: string;
  note: string;
}
interface ModelData {
  model: string;
  models: ModelOption[];
}

export function ModelSwitcher() {
  const { data, mutate } = useSWR<ModelData>("/api/dashboard/model", fetcher);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const models = data?.models ?? [];
  const current = models.find((m) => m.id === data?.model);
  const label = current?.label ?? "";

  if (!data) return <Skeleton className="h-8 w-full rounded-lg" />;

  async function choose(id: string) {
    if (id === data?.model) return;
    setBusy(true);
    try {
      await apiMutate("/api/dashboard/model", "POST", { model: id });
      await mutate();
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger
        disabled={busy}
        className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-foreground transition-colors hover:border-line-strong hover:bg-surface-3 disabled:opacity-50"
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-copper-bright" />
        <span className="flex-1 truncate text-left">{label}</span>
        <span className={cn("text-[10px] text-muted-2 transition-transform", open && "rotate-180")}><Icon name="chevronDown" size={12} /></span>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-50 w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-line-strong bg-surface-2 p-1 shadow-2xl shadow-black/40 fade-up"
        >
          {models.map((m) => {
            const active = m.id === data?.model;
            return (
              <DropdownMenu.Item
                key={m.id}
                onSelect={() => choose(m.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none transition-colors",
                  active ? "bg-copper/15 text-copper-bright" : "text-foreground hover:bg-surface-3"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{m.label}</span>
                  <span className="mono block text-[10px] text-muted-2">{m.note}</span>
                </span>
                {active && <span className="text-xs text-copper-bright">✓</span>}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
