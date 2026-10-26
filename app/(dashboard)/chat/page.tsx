"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { usePoll } from "@/hooks/use-poll";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { OpenInTelegram } from "@/components/common/open-in-telegram";
import { VoiceRecorder } from "@/components/chat/voice-recorder";
import { AttachSheet } from "@/components/chat/attach-sheet";
import { useUnread } from "@/components/layout/unread";
import { useToast } from "@/components/ui/toast";
import { apiMutate, fetcher, ApiError } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import type { HistoryEntry } from "@/lib/types";

interface ChatData {
  messages: HistoryEntry[];
  total: number;
}

async function compressImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const max = 1280;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, 0, 0, w, h);
  let q = 0.82;
  let out = canvas.toDataURL("image/jpeg", q);
  while (out.length * 0.75 > 900 * 1024 && q > 0.4) {
    q -= 0.1;
    out = canvas.toDataURL("image/jpeg", q);
  }
  return out;
}

export default function ChatPage() {
  const t = useTranslations("chat");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { data, mutate, isValidating } = usePoll<ChatData>("/api/chat?limit=500", 5000);
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [pendingVoice, setPendingVoice] = useState<{ voiceId: string; durationMs: number; transcript: string; localUrl: string } | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<{ photoId: string; caption: string } | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    atBottomRef.current = near;
    setAtBottom(near);
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    bottomRef.current?.scrollIntoView({ behavior });
  }

  // transient file input (no persistent DOM field → no iOS keyboard accessory)
  function openCamera() {
    if (sending) return;
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    inp.setAttribute("capture", "environment");
    inp.onchange = () => {
      const f = inp.files?.[0];
      if (f) sendImage(f);
    };
    inp.click();
  }

  useEffect(() => {
    if (atBottomRef.current || pendingUser || pendingVoice || pendingPhoto) scrollToBottom();
  }, [data?.total, pendingUser, pendingVoice, pendingPhoto]);

  useEffect(() => {
    document.body.classList.add("chat-lock");
    return () => {
      document.body.classList.remove("chat-lock");
      document.body.classList.remove("kbd-open");
    };
  }, []);

  // reset any iOS document scroll when the keyboard dismisses (belt-and-braces;
  // the chat container itself is position:fixed inset-0 so it tracks the viewport).
  useEffect(() => {
    const reset = () => {
      if (window.scrollY || document.documentElement.scrollTop) {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
      }
    };
    window.addEventListener("focusout", reset);
    window.addEventListener("scroll", reset, { passive: true });
    return () => {
      window.removeEventListener("focusout", reset);
      window.removeEventListener("scroll", reset);
    };
  }, []);

  // viewing the chat clears the unread badge
  const { markRead } = useUnread();
  useEffect(() => {
    if (data) markRead(data.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.total]);

  async function awaitReply(lenBefore: number) {
    const start = Date.now();
    let found = false;
    while (Date.now() - start < 30000) {
      await new Promise((r) => setTimeout(r, 1500));
      const fresh = await fetcher<ChatData>("/api/chat?limit=500").catch(() => null);
      if (fresh) {
        await mutate(fresh, { revalidate: false });
        if (fresh.messages.find((m) => m.role === "assistant" && m.index >= lenBefore)) {
          found = true;
          break;
        }
      }
    }
    if (!found) toast(t("noReply"), "info");
  }

  async function runText(tx: string) {
    if (!tx || sending) return;
    setSending(true);
    setPendingUser(tx);
    try {
      const { lenBefore } = await apiMutate<{ lenBefore: number }>("/api/chat/send", "POST", { text: tx });
      await awaitReply(lenBefore);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : t("sendFailed"), "error");
    } finally {
      setSending(false);
      setPendingUser(null);
      mutate();
    }
  }

  function clearComposer() {
    if (composerRef.current) composerRef.current.innerText = "";
    setText("");
  }

  function send() {
    const tx = (composerRef.current?.innerText ?? text).trim();
    clearComposer();
    runText(tx);
  }

  async function sendVoice(blob: Blob, durationMs: number) {
    if (sending) return;
    // show the voice bubble immediately (local playback) so the order is
    // [my voice] → [typing] → [reply], not the reverse.
    const localUrl = URL.createObjectURL(blob);
    setPendingVoice({ voiceId: "", durationMs, transcript: "", localUrl });
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("audio", blob, `audio.${blob.type.includes("mp4") ? "m4a" : "webm"}`);
      fd.append("durationMs", String(durationMs));
      const res = await fetch("/api/chat/voice", { method: "POST", body: fd });
      if (!res.ok) throw new Error("voice");
      const { transcript, voiceId, lenBefore } = (await res.json()) as {
        transcript: string;
        voiceId: string;
        lenBefore: number;
      };
      setPendingVoice((pv) => (pv ? { ...pv, voiceId, transcript } : null));
      await awaitReply(lenBefore);
    } catch {
      toast(t("voiceFailed"), "error");
    } finally {
      setSending(false);
      setPendingVoice(null);
      URL.revokeObjectURL(localUrl);
      mutate();
    }
  }

  async function sendImage(file: File) {
    if (sending) return;
    setSending(true);
    try {
      const dataUrl = await compressImage(file);
      const { photoId, content, lenBefore } = await apiMutate<{ photoId: string; content: string; lenBefore: number }>(
        "/api/chat/photo",
        "POST",
        { dataUrl }
      );
      setPendingPhoto({ photoId, caption: content === "(photo envoyée)" ? "" : content });
      await awaitReply(lenBefore);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : t("photoFailed"), "error");
    } finally {
      setSending(false);
      setPendingPhoto(null);
      mutate();
    }
  }

  const messages = data?.messages ?? [];
  // a user message is "read" (2 blue checks) once the bot has replied after it
  const lastAssistantIndex = messages.reduce((acc, m) => (m.role === "assistant" && m.index > acc ? m.index : acc), -1);

  return (
    <div className="fade-up relative flex min-h-0 flex-1 flex-col">
      {/* desktop only — on mobile the conversation header (MobileBar) is the title */}
      <div className="hidden md:block">
        <PageHeader title={t("title")} subtitle={t("subtitle")} icon="chat" onRefresh={() => mutate()} isValidating={isValidating} action={<OpenInTelegram />} />
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 touch-pan-y space-y-3 overflow-y-auto overflow-x-hidden overscroll-contain px-0.5 py-2">
        {!data ? (
          <div className="space-y-3">
            <Skeleton className="ml-auto h-12 w-2/3" />
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="ml-auto h-12 w-1/2" />
          </div>
        ) : messages.length === 0 && !pendingUser && !pendingVoice && !pendingPhoto ? (
          <EmptyState message={t("noMessages")} icon="chat" />
        ) : (
          <>
            {(() => {
              let lastDay = "";
              const out: React.ReactNode[] = [];
              for (const m of messages) {
                if (m.ts) {
                  const dk = dayKey(m.ts, locale);
                  if (dk !== lastDay) {
                    lastDay = dk;
                    out.push(<DaySeparator key={`d-${m.index}`} label={dayLabel(m.ts, locale, tc)} />);
                  }
                }
                out.push(<Bubble key={m.index} entry={m} locale={locale} read={m.index < lastAssistantIndex} />);
              }
              return out;
            })()}
            {pendingUser && <Bubble entry={{ role: "user", content: pendingUser, index: -1 }} pending locale={locale} />}
            {pendingPhoto && !messages.some((m) => m.photoId === pendingPhoto.photoId) && (
              <Bubble entry={{ role: "user", content: pendingPhoto.caption, index: -2, photoId: pendingPhoto.photoId }} pending locale={locale} />
            )}
            {pendingVoice && !(pendingVoice.voiceId && messages.some((m) => m.voiceId === pendingVoice.voiceId)) && (
              <Bubble
                entry={{ role: "user", content: pendingVoice.transcript, index: -3, durationMs: pendingVoice.durationMs }}
                voiceSrc={pendingVoice.localUrl}
                pending
                locale={locale}
              />
            )}
            {sending && <TypingIndicator />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {!atBottom && (
        <button
          onClick={() => scrollToBottom()}
          aria-label="scroll to bottom"
          className="liquid-glass absolute bottom-[68px] right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full text-foreground shadow-lg shadow-black/40 active:scale-90"
        >
          <Icon name="chevronDown" size={20} />
        </button>
      )}

      <div className="relative mt-3 mb-[15px] flex items-end gap-1.5">
        <AttachSheet onImage={sendImage} onText={runText} disabled={sending} />
        <div
          ref={composerRef}
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label={t("title")}
          suppressContentEditableWarning
          onInput={() => setText(composerRef.current?.innerText ?? "")}
          onFocus={() => document.body.classList.add("kbd-open")}
          onBlur={() => document.body.classList.remove("kbd-open")}
          onPaste={(e) => {
            e.preventDefault();
            const txt = e.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, txt);
            setText(composerRef.current?.innerText ?? "");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          className="chat-input max-h-32 min-h-[40px] flex-1 overflow-y-auto whitespace-pre-wrap break-words rounded-3xl border border-line bg-surface-2 px-4 py-2.5 text-sm leading-relaxed text-foreground outline-none"
        />
        {text.trim() ? (
          <Button variant="primary" size="icon" className="h-10 w-10 shrink-0 rounded-full" loading={sending} onClick={send} aria-label="send">
            <Icon name="send" size={16} />
          </Button>
        ) : (
          <>
            <button
              onClick={openCamera}
              disabled={sending}
              aria-label={t("camera")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground/90 transition-all hover:text-foreground active:scale-90 disabled:opacity-50"
            >
              <Icon name="camera" size={22} />
            </button>
            <VoiceRecorder onSend={sendVoice} onError={(m) => toast(m, "error")} disabled={sending} />
          </>
        )}
      </div>
    </div>
  );
}

function fmtSec(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function dayKey(ts: number, locale: string): string {
  return new Date(ts).toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function dayLabel(ts: number, locale: string, tc: (k: string) => string): string {
  const d = new Date(ts);
  const now = new Date();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return tc("today");
  if (sameDay(d, yest)) return tc("yesterday");
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
function timeLabel(ts: number, locale: string): string {
  return new Date(ts).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function DaySeparator({ label }: { label: string }) {
  return (
    <div className="my-3 flex justify-center">
      <span className="rounded-full bg-surface-2/80 px-3 py-1 text-[11px] font-medium text-muted-2 backdrop-blur">{label}</span>
    </div>
  );
}

function Bubble({
  entry,
  pending,
  voiceSrc,
  locale,
  read,
}: {
  entry: HistoryEntry;
  pending?: boolean;
  voiceSrc?: string;
  locale: string;
  read?: boolean;
}) {
  const t = useTranslations("chat");
  const isUser = entry.role === "user";
  const [showTranscript, setShowTranscript] = useState(false);
  const hasTranscript = !!entry.content && entry.content !== "(message vocal)";
  const audioSrc = voiceSrc || (entry.voiceId ? `/api/chat/voice/audio?id=${entry.voiceId}` : "");
  const isText = !entry.photoId && !audioSrc;

  const ticks = isUser ? (
    pending ? (
      <Icon name="check" size={13} className="shrink-0 text-muted-2" />
    ) : read ? (
      <Icon name="checkDouble" size={14} className="shrink-0 text-[#4dd6f0]" />
    ) : (
      <Icon name="checkDouble" size={14} className="shrink-0 text-muted-2" />
    )
  ) : null;

  // WhatsApp-style meta: floats to bottom-right; on a short message it sits to the
  // right of the line, on a multi-line one it lands at the bottom-right corner.
  const meta = (
    <span className={cn("inline-flex items-center gap-1 text-[10px] text-muted-2", isText ? "bubble-meta" : "ml-2")}>
      {entry.ts && <span>{timeLabel(entry.ts, locale)}</span>}
      {ticks}
    </span>
  );

  return (
    <div className={cn("flex fade-up", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] min-w-0 break-anywhere rounded-2xl px-3.5 py-2 text-sm leading-relaxed md:max-w-[75%]",
          isUser ? "rounded-br-sm bg-copper/20 text-foreground" : "rounded-bl-sm border border-line bg-surface-2 text-foreground/90",
          pending && "opacity-60"
        )}
      >
        {entry.photoId ? (
          <div className="space-y-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/chat/photo/data?id=${entry.photoId}`} alt="" className="max-h-64 w-full rounded-xl object-cover" />
            {entry.content && entry.content !== "(photo envoyée)" && <p className="text-sm">{entry.content}</p>}
            <div className="flex justify-end">{meta}</div>
          </div>
        ) : audioSrc ? (
          <div className="space-y-1.5">
            <VoicePlayer src={audioSrc} durationMs={entry.durationMs ?? 0} />
            {hasTranscript && (
              <>
                <button
                  onClick={() => setShowTranscript((v) => !v)}
                  className="text-[11px] font-medium text-copper-bright hover:underline"
                >
                  {showTranscript ? t("hideTranscript") : t("showTranscript")}
                </button>
                {showTranscript && <p className="break-anywhere text-[12px] text-foreground/70">{entry.content}</p>}
              </>
            )}
            <div className="flex justify-end">{meta}</div>
          </div>
        ) : (
          <div className="cf">
            <span className="md md-inline">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{ p: (props) => <>{props.children}</> }}>
                {entry.content}
              </ReactMarkdown>
            </span>
            {meta}
          </div>
        )}
      </div>
    </div>
  );
}

function VoicePlayer({ src, durationMs }: { src: string; durationMs: number }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(durationMs / 1000 || 0);

  function toggle() {
    const a = ref.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play().catch(() => {});
  }

  return (
    <div className="flex min-w-[180px] items-center gap-2.5">
      <button
        onClick={toggle}
        aria-label={playing ? "pause" : "play"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-copper/30 text-copper-bright transition-colors hover:bg-copper/40"
      >
        <Icon name={playing ? "pause" : "play"} size={16} />
      </button>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/15">
        <div className="h-full rounded-full bg-copper-bright transition-[width] duration-150" style={{ width: `${pos * 100}%` }} />
      </div>
      <span className="mono shrink-0 text-[11px] text-muted-2">{fmtSec(playing || cur > 0 ? cur : dur)}</span>
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setPos(0);
          setCur(0);
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (isFinite(d) && d > 0) setDur(d);
        }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setCur(a.currentTime);
          const total = isFinite(a.duration) && a.duration > 0 ? a.duration : dur;
          if (total > 0) setPos(Math.min(1, a.currentTime / total));
        }}
      />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-line bg-surface-2 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted pulse-copper" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );
}
