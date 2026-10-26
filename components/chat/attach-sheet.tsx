"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import * as Dialog from "@radix-ui/react-dialog";
import { Icon, type IconName } from "@/components/ui/icon";

/** Pick a file via a transient input (no persistent DOM field → no iOS keyboard accessory). */
function pickFile(accept: string, capture: boolean, cb: (f: File) => void) {
  const inp = document.createElement("input");
  inp.type = "file";
  if (accept) inp.accept = accept;
  if (capture) inp.setAttribute("capture", "environment");
  inp.onchange = () => {
    const f = inp.files?.[0];
    if (f) cb(f);
  };
  inp.click();
}

/**
 * Telegram-style "+" attachment sheet. Photos/Camera send an image to the bot
 * (vision); Location/Contact/Document send a text note. No Poll/Event/AI images.
 */
export function AttachSheet({
  onImage,
  onText,
  disabled,
}: {
  onImage: (file: File) => void;
  onText: (text: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("chat");
  const [open, setOpen] = useState(false);

  function chooseImage(capture: boolean) {
    setOpen(false);
    pickFile("image/*", capture, (f) => onImage(f));
  }
  function chooseDoc() {
    setOpen(false);
    pickFile("", false, (f) => onText(`${t("document")}: ${f.name} (${Math.round(f.size / 1024)} Ko)`));
  }
  function location() {
    setOpen(false);
    if (!navigator.geolocation) return onText(t("locationDenied"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: la, longitude: lo } = pos.coords;
        onText(`${t("location")}: ${la.toFixed(5)}, ${lo.toFixed(5)} — https://maps.google.com/?q=${la},${lo}`);
      },
      () => onText(t("locationDenied")),
      { timeout: 10000 }
    );
  }
  async function contact() {
    setOpen(false);
    const nav = navigator as Navigator & {
      contacts?: { select: (p: string[], o: { multiple: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>> };
    };
    if (nav.contacts?.select) {
      try {
        const picked = await nav.contacts.select(["name", "tel"], { multiple: false });
        if (picked[0]) {
          const n = picked[0].name?.[0] ?? "";
          const tel = picked[0].tel?.[0] ?? "";
          onText(`${t("contact")}: ${`${n} ${tel}`.trim()}`);
          return;
        }
      } catch {
        /* fall through to prompt */
      }
    }
    const v = window.prompt(t("contact"));
    if (v) onText(`${t("contact")}: ${v}`);
  }

  // Telegram look: dark gray tiles, colored icons.
  const items: { key: string; icon: IconName; label: string; color: string; onClick: () => void }[] = [
    { key: "photos", icon: "image", label: t("photos"), color: "text-sky-400", onClick: () => chooseImage(false) },
    { key: "camera", icon: "camera", label: t("camera"), color: "text-foreground", onClick: () => chooseImage(true) },
    { key: "location", icon: "location", label: t("location"), color: "text-emerald-400", onClick: location },
    { key: "contact", icon: "user", label: t("contact"), color: "text-muted", onClick: contact },
    { key: "document", icon: "document", label: t("document"), color: "text-sky-400", onClick: chooseDoc },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger
          disabled={disabled}
          aria-label={t("attach")}
          className="flex h-10 w-9 shrink-0 items-center justify-center rounded-full text-foreground/90 transition-all hover:text-foreground active:scale-90 disabled:opacity-50"
        >
          <Icon name="plus" size={26} />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] border-t border-line bg-surface px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/50 fade-up">
            <Dialog.Title className="sr-only">{t("attach")}</Dialog.Title>
            <div className="mx-auto mb-6 h-1.5 w-10 rounded-full bg-foreground/25" />
            <div className="mx-auto grid max-w-md grid-cols-4 gap-x-3 gap-y-6">
              {items.map((it) => (
                <button key={it.key} onClick={it.onClick} className="flex flex-col items-center gap-2.5 active:scale-95">
                  <span className="flex h-[60px] w-full items-center justify-center rounded-[20px] bg-foreground/[0.07]">
                    <Icon name={it.icon} size={28} className={it.color} />
                  </span>
                  <span className="text-[13px] font-medium text-foreground/90">{it.label}</span>
                </button>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
  );
}
