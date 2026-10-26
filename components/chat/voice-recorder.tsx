"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type Mode = "idle" | "recording" | "locked";

const LOCK_DIST = 64; // px to slide up to lock
const CANCEL_DIST = 96; // px to slide left to cancel
const MIN_MS = 500; // ignore accidental taps

function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Telegram/WhatsApp-style voice recorder: hold the mic to record (UI shows
 * instantly), slide up to lock, slide left to cancel, release to send.
 * getUserMedia is called synchronously inside the pointerdown gesture (required
 * by iOS Safari) and the recording UI appears immediately for clear feedback.
 */
export function VoiceRecorder({
  onSend,
  onError,
  disabled,
}: {
  onSend: (blob: Blob, durationMs: number) => void;
  onError?: (msg: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("chat");
  const [mode, setMode] = useState<Mode>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [slideX, setSlideX] = useState(0);
  const [lockProg, setLockProg] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startRef = useRef({ x: 0, y: 0, t: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const modeRef = useRef<Mode>("idle");
  const cancelRef = useRef(false);
  const captureRef = useRef<{ el: HTMLElement; pid: number } | null>(null);

  const setBoth = (m: Mode) => {
    modeRef.current = m;
    setMode(m);
  };

  function releaseCapture() {
    const c = captureRef.current;
    if (c) {
      try {
        c.el.releasePointerCapture(c.pid);
      } catch {
        /* ignore */
      }
      captureRef.current = null;
    }
  }

  function teardown() {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    releaseCapture();
  }

  useEffect(() => () => teardown(), []);

  function resetIdle() {
    teardown();
    recorderRef.current = null;
    setBoth("idle");
    setSlideX(0);
    setLockProg(0);
  }

  function begin(e: React.PointerEvent) {
    if (disabled || modeRef.current !== "idle") return;
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    const pid = e.pointerId;
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    try {
      el.setPointerCapture(pid);
      captureRef.current = { el, pid };
    } catch {
      /* ignore */
    }
    cancelRef.current = false;
    setElapsedMs(0);
    setSlideX(0);
    setLockProg(0);
    setBoth("recording"); // instant feedback
    timerRef.current = setInterval(() => setElapsedMs(Date.now() - startRef.current.t), 100);

    // getUserMedia MUST be called inside the gesture (iOS); handle the promise after.
    let req: Promise<MediaStream>;
    try {
      req = navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError?.(t("micDenied"));
      resetIdle();
      return;
    }
    req
      .then((stream) => {
        if (modeRef.current === "idle") {
          stream.getTracks().forEach((tr) => tr.stop()); // released before grant
          return;
        }
        streamRef.current = stream;
        let mr: MediaRecorder;
        try {
          mr = new MediaRecorder(stream);
        } catch {
          onError?.(t("micDenied"));
          resetIdle();
          return;
        }
        chunksRef.current = [];
        mr.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunksRef.current.push(ev.data);
        };
        recorderRef.current = mr;
        mr.start();
      })
      .catch(() => {
        onError?.(t("micDenied"));
        resetIdle();
      });
  }

  function move(e: React.PointerEvent) {
    if (modeRef.current !== "recording") return;
    const dx = startRef.current.x - e.clientX;
    const dy = startRef.current.y - e.clientY;
    setSlideX(Math.max(0, dx));
    setLockProg(Math.min(1, Math.max(0, dy / LOCK_DIST)));
    if (dy > LOCK_DIST) {
      setLockProg(1);
      setBoth("locked");
      releaseCapture();
    } else if (dx > CANCEL_DIST) {
      cancelRef.current = true;
      void finish();
    }
  }

  function up() {
    if (modeRef.current === "recording") void finish();
  }

  async function finish() {
    const mr = recorderRef.current;
    const durationMs = Date.now() - startRef.current.t;
    const cancelled = cancelRef.current || durationMs < MIN_MS;
    let blob: Blob | null = null;
    if (mr) {
      const mime = mr.mimeType || "audio/webm";
      blob = await new Promise<Blob>((resolve) => {
        mr.onstop = () => resolve(new Blob(chunksRef.current, { type: mime }));
        if (mr.state !== "inactive") mr.stop();
        else resolve(new Blob(chunksRef.current, { type: mime }));
      });
    }
    resetIdle();
    if (!cancelled && blob && blob.size > 0) onSend(blob, durationMs);
  }

  const cancelLocked = () => {
    cancelRef.current = true;
    void finish();
  };
  const sendLocked = () => {
    cancelRef.current = false;
    void finish();
  };

  const cancelOpacity = Math.max(0, 1 - slideX / CANCEL_DIST);

  return (
    <>
      {mode !== "idle" && (
        <div className="absolute inset-0 z-10 flex items-center gap-3 rounded-full border border-line bg-surface-2 px-4">
          <span className="flex shrink-0 items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-danger pulse-copper" />
            <span className="mono text-foreground">{fmt(elapsedMs)}</span>
          </span>
          {mode === "recording" ? (
            <span
              className="flex flex-1 items-center justify-center gap-1 text-sm text-muted-2"
              style={{ opacity: cancelOpacity, transform: `translateX(${-slideX * 0.4}px)` }}
            >
              <Icon name="chevronDown" size={14} className="rotate-90" />
              {t("slideToCancel")}
            </span>
          ) : (
            <>
              <button
                onClick={cancelLocked}
                aria-label={t("cancelRecording")}
                className="pointer-events-auto z-20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-2 transition-colors hover:text-danger"
              >
                <Icon name="delete" size={18} />
              </button>
              <span className="flex flex-1 items-center justify-center gap-1.5 text-xs text-muted-2">
                <Icon name="power" size={12} className="text-copper-bright" />
                {t("locked")}
              </span>
            </>
          )}
        </div>
      )}

      {mode === "recording" && (
        <div className="pointer-events-none absolute bottom-[calc(100%+10px)] right-1 z-20 flex flex-col items-center">
          <div
            className="flex h-14 w-9 flex-col items-center justify-start gap-1 rounded-full border border-line-strong bg-surface-2 pt-2 shadow-lg"
            style={{ opacity: 0.5 + lockProg * 0.5 }}
          >
            <Icon name="power" size={14} className={cn("transition-colors", lockProg > 0.7 ? "text-copper-bright" : "text-muted-2")} />
            <span className="text-muted-2" style={{ transform: `translateY(${lockProg * 3}px)` }}>
              <Icon name="chevronDown" size={14} className="rotate-180" />
            </span>
          </div>
        </div>
      )}

      {mode === "locked" ? (
        <button
          onClick={sendLocked}
          aria-label="send"
          className="relative z-20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-copper text-[#02033f] transition-transform active:scale-95"
        >
          <Icon name="send" size={16} />
        </button>
      ) : (
        <button
          onPointerDown={begin}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          disabled={disabled}
          aria-label={t("voiceRecord")}
          style={{ touchAction: "none" }}
          className={cn(
            "relative z-20 flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full transition-all duration-150 disabled:opacity-50",
            mode === "recording"
              ? "scale-110 bg-danger text-white shadow-[0_0_24px_-4px_var(--danger)]"
              : "text-foreground/90 hover:text-foreground active:scale-90"
          )}
        >
          <Icon name="mic" size={22} />
        </button>
      )}
    </>
  );
}
