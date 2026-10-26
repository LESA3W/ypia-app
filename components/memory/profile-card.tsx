"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { fetcher } from "@/lib/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiMutate, ApiError } from "@/lib/fetcher";
import { Icon } from "@/components/ui/icon";

interface Field {
  field: string;
  value: string;
  labelKey?: string;
}
interface ProfileData {
  canonical: Field[];
  custom: Field[];
  name: string;
  agency: string;
  city: string;
}

const PROFILE_KEY = "/api/memory/profile";
const AVATAR_KEY = "/api/memory/profile/avatar";

async function compressImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const max = 400;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(img, 0, 0, w, h);

  let quality = 0.8;
  let out = canvas.toDataURL("image/jpeg", quality);
  while (out.length * 0.75 > 100 * 1024 && quality > 0.3) {
    quality -= 0.1;
    out = canvas.toDataURL("image/jpeg", quality);
  }
  return out;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileCard() {
  const t = useTranslations("memory");
  const { data, mutate, isLoading } = useSWR<ProfileData>(PROFILE_KEY, fetcher);
  const avatar = useSWR<{ avatar: string | null }>(AVATAR_KEY, fetcher);
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function saveField(field: string, value: string) {
    await apiMutate(PROFILE_KEY, "PATCH", { field, value });
    mutate();
  }
  async function deleteField(field: string) {
    await apiMutate(PROFILE_KEY, "PATCH", { field, _delete: true });
    mutate();
    toast(t("fieldDeleted"), "success");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImage(file);
      await apiMutate(AVATAR_KEY, "POST", { dataUrl });
      avatar.mutate();
      toast(t("photoUpdated"), "success");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t("uploadFailed"), "error");
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    await apiMutate(AVATAR_KEY, "DELETE").catch(() => {});
    avatar.mutate();
    toast(t("photoRemoved"), "success");
  }

  const avatarUrl = avatar.data?.avatar;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          <button
            onClick={() => fileRef.current?.click()}
            className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-line-strong"
            aria-label={t("changePhoto")}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-copper text-2xl font-semibold text-[#02033f]">
                {isLoading ? "" : initials(data?.name || "") || <Icon name="user" size={28} />}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
              <Icon name="camera" size={18} />
            </span>
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="spin h-5 w-5 rounded-full border-2 border-copper-bright border-t-transparent" />
              </span>
            )}
          </button>

          <div className="min-w-0 flex-1">
            {isLoading ? (
              <Skeleton className="h-7 w-40" />
            ) : (
              <h2 className="truncate text-xl font-semibold">{data?.name || t("noName")}</h2>
            )}
            {data?.agency && <p className="truncate text-sm text-foreground/80">{data.agency}</p>}
            {data?.city && <p className="truncate text-sm text-muted">{data.city}</p>}

            <div className="mt-2.5 flex gap-2">
              <Button size="sm" variant="secondary" loading={uploading} onClick={() => fileRef.current?.click()}>
                <Icon name="camera" size={14} />
                {t("changePhoto")}
              </Button>
              {avatarUrl && (
                <Button size="sm" variant="ghost" onClick={removeAvatar}>
                  {t("removePhoto")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("profileMain")}</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-line">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="my-2 h-6 w-full" />)
            : data?.canonical.map((f) => (
                <FieldRow key={f.field} field={f.field} label={f.labelKey ? t(f.labelKey) : undefined} value={f.value} onSave={saveField} />
              ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("customFields", { count: data?.custom.length ?? 0 })}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="divide-y divide-line">
              {data?.custom.map((f) => (
                <FieldRow key={f.field} field={f.field} value={f.value} onSave={saveField} onDelete={deleteField} />
              ))}
              {data && data.custom.length === 0 && <p className="py-2 text-sm text-muted-2">{t("noCustom")}</p>}
            </div>
          )}
          <AddField onAdd={saveField} />
        </CardContent>
      </Card>
    </div>
  );
}

function FieldRow({
  field,
  label,
  value,
  onSave,
  onDelete,
}: {
  field: string;
  label?: string;
  value: string;
  onSave: (field: string, value: string) => Promise<void>;
  onDelete?: (field: string) => Promise<void>;
}) {
  const t = useTranslations("memory");
  const tc = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const { toast } = useToast();

  async function commit() {
    try {
      await onSave(field, val);
      setEditing(false);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : t("genericError"), "error");
    }
  }

  return (
    <div className="group flex items-center gap-3 py-2.5">
      <span className="w-24 shrink-0 break-anywhere text-sm text-muted">{label ?? field}</span>
      {editing ? (
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          autoFocus
          className="h-8 flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setVal(value);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          onClick={() => {
            setVal(value);
            setEditing(true);
          }}
          className="min-w-0 flex-1 break-anywhere text-left text-sm text-foreground"
        >
          {value || <span className="text-muted-2">{tc("empty")}</span>}
        </button>
      )}
      {editing ? (
        <>
          <Button size="icon" variant="ghost" aria-label={tc("save")} onClick={commit}>
            <Icon name="save" size={15} className="text-ok" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={tc("cancel")}
            onClick={() => {
              setVal(value);
              setEditing(false);
            }}
          >
            <Icon name="close" size={14} />
          </Button>
        </>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setVal(value);
              setEditing(true);
            }}
            aria-label={`edit ${field}`}
            className="p-1 text-muted-2 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 max-md:opacity-100"
          >
            <Icon name="edit" size={14} />
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(field)}
              aria-label={`${t("deleteMemory")}`}
              className="p-1 text-muted-2 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 max-md:opacity-100"
            >
              <Icon name="delete" size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AddField({ onAdd }: { onAdd: (field: string, value: string) => Promise<void> }) {
  const t = useTranslations("memory");
  const [field, setField] = useState("");
  const [value, setValue] = useState("");
  const { toast } = useToast();

  async function add() {
    if (!field.trim()) return;
    try {
      await onAdd(field.trim(), value);
      setField("");
      setValue("");
      toast(t("fieldAdded"), "success");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : t("genericError"), "error");
    }
  }

  return (
    <div className="mt-3 flex gap-2 border-t border-line pt-3">
      <Input placeholder={t("key")} value={field} onChange={(e) => setField(e.target.value)} className="w-1/3" />
      <Input
        placeholder={t("value")}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
      />
      <Button variant="primary" size="icon" aria-label={t("addField")} disabled={!field.trim()} onClick={add}>
        <Icon name="add" size={15} />
      </Button>
    </div>
  );
}
