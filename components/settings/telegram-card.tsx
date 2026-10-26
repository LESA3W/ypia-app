"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { fetcher, apiMutate, ApiError } from "@/lib/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";

interface TgProfile {
  name: string;
  shortDescription: string;
  description: string;
}

const PHOTO_KEY = "/api/dashboard/telegram/photo";

/** Center-crop to a square and compress to a JPEG data URL under ~200KB. */
async function compressSquare(file: File): Promise<string> {
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
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  const out = Math.min(640, side);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);

  let quality = 0.85;
  let result = canvas.toDataURL("image/jpeg", quality);
  while (result.length * 0.75 > 200 * 1024 && quality > 0.3) {
    quality -= 0.1;
    result = canvas.toDataURL("image/jpeg", quality);
  }
  return result;
}

export function TelegramCard() {
  const t = useTranslations("telegram");
  const tc = useTranslations("common");
  const tm = useTranslations("memory");
  const { data, mutate } = useSWR<TgProfile>("/api/dashboard/telegram", fetcher);
  const { toast } = useToast();
  const [form, setForm] = useState<TgProfile>({ name: "", shortDescription: "", description: "" });
  const [loading, setLoading] = useState(false);

  // bot profile photo
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoVer, setPhotoVer] = useState(0);
  const [hasPhoto, setHasPhoto] = useState(true);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const dirty =
    !!data &&
    (form.name !== data.name ||
      form.shortDescription !== data.shortDescription ||
      form.description !== data.description);

  async function save() {
    setLoading(true);
    try {
      await apiMutate("/api/dashboard/telegram", "POST", form);
      toast(t("saved"), "success");
      mutate();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Error", "error");
    } finally {
      setLoading(false);
    }
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    try {
      const dataUrl = await compressSquare(file);
      await apiMutate(PHOTO_KEY, "POST", { dataUrl });
      setHasPhoto(true);
      setPhotoVer((v) => v + 1);
      toast(tm("photoUpdated"), "success");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : tm("uploadFailed"), "error");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    try {
      await apiMutate(PHOTO_KEY, "DELETE");
      setHasPhoto(false);
      setPhotoVer((v) => v + 1);
      toast(tm("photoRemoved"), "success");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : tm("uploadFailed"), "error");
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-[11px] text-muted-2">{t("hint")}</p>

        {/* Bot profile photo */}
        <div className="flex items-center gap-4 border-b border-line pb-4">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={photoBusy}
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-line-strong disabled:opacity-60"
            aria-label={tm("changePhoto")}
          >
            {hasPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${PHOTO_KEY}?v=${photoVer}`}
                alt="Bot"
                className="h-full w-full object-cover"
                onError={() => setHasPhoto(false)}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-surface-3 text-muted-2">
                <Icon name="user" size={26} />
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
              <Icon name="camera" size={18} />
            </span>
            {photoBusy && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/60">
                <span className="spin h-5 w-5 rounded-full border-2 border-copper-bright border-t-transparent" />
              </span>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 text-sm font-medium">{t("photo")}</div>
            <p className="mb-2 text-[11px] text-muted-2">{t("photoHint")}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" loading={photoBusy} onClick={() => fileRef.current?.click()}>
                <Icon name="camera" size={14} />
                {tm("changePhoto")}
              </Button>
              {hasPhoto && (
                <Button size="sm" variant="ghost" disabled={photoBusy} onClick={removePhoto}>
                  {tm("removePhoto")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {!data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <div>
              <label className="mb-1 block text-xs text-muted">{t("name")}</label>
              <Input value={form.name} maxLength={64} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">{t("short")}</label>
              <Input
                value={form.shortDescription}
                maxLength={120}
                onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">{t("description")}</label>
              <Textarea
                rows={4}
                value={form.description}
                maxLength={512}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="primary" loading={loading} disabled={!dirty} onClick={save}>
                {tc("save")}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
