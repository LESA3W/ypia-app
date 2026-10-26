"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePoll } from "@/hooks/use-poll";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/states";
import { useToast } from "@/components/ui/toast";
import { apiMutate } from "@/lib/fetcher";
import { ProfileCard } from "@/components/memory/profile-card";
import { Icon } from "@/components/ui/icon";

export default function MemoryPage() {
  const t = useTranslations("memory");
  const memories = usePoll<{ memories: string[] }>("/api/memory/memories");
  const { toast } = useToast();

  return (
    <div className="fade-up space-y-4">
      <PageHeader title={t("title")} subtitle={t("subtitle")} icon="memory" />

      <ProfileCard />

      <MemoriesList
        memories={memories.data?.memories}
        loading={!memories.data}
        onAdd={async (text) => {
          await apiMutate("/api/memory/memories", "POST", { text });
          memories.mutate();
          toast(t("memoryAdded"), "success");
        }}
        onDelete={async (index) => {
          await apiMutate("/api/memory/memories", "DELETE", { index });
          memories.mutate();
          toast(t("memoryDeleted"), "success");
        }}
      />
    </div>
  );
}

function MemoriesList({
  memories,
  loading,
  onAdd,
  onDelete,
}: {
  memories?: string[];
  loading: boolean;
  onAdd: (text: string) => Promise<void>;
  onDelete: (index: number) => Promise<void>;
}) {
  const t = useTranslations("memory");
  const [text, setText] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("memoriesTitle", { count: memories?.length ?? 0 })}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder={t("newMemory")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && text.trim()) {
                await onAdd(text.trim());
                setText("");
              }
            }}
          />
          <Button
            variant="primary"
            size="icon"
            aria-label={t("addMemory")}
            disabled={!text.trim()}
            onClick={async () => {
              await onAdd(text.trim());
              setText("");
            }}
          >
            <Icon name="add" size={15} />
          </Button>
        </div>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : !memories || memories.length === 0 ? (
          <EmptyState message={t("noMemories")} icon="memory" />
        ) : (
          <ul className="space-y-1.5">
            {memories.map((m, i) => (
              <li key={i} className="group flex items-start gap-2 rounded-md border border-line bg-surface-2 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 break-anywhere">{m}</span>
                <button
                  onClick={() => onDelete(i)}
                  className="shrink-0 p-1 text-muted-2 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 max-md:opacity-100"
                  aria-label={t("deleteMemory")}
                >
                  <Icon name="delete" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
