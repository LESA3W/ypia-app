"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { apiMutate, ApiError } from "@/lib/fetcher";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { resolvedTheme } = useTheme();
  const t = useTranslations("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiMutate("/api/login", "POST", { email, password });
      const from = params.get("from") || "/";
      router.replace(from);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("invalid"));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm fade-up">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolvedTheme === "dark" ? "/wordmark.png" : "/wordmark-light.png"} alt="ypia" className="mx-auto h-12 w-auto" />
          <p className="mt-4 text-sm font-medium text-foreground/80">Your personal intelligent assistant.</p>
          <p className="mt-1 text-xs text-muted-2">{t("subtitle")}</p>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs text-muted">
              {t("email")}
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs text-muted">
              {t("password")}
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? t("hidePassword") : t("showPassword")}
                aria-pressed={showPw}
                className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-2 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-copper-bright"
              >
                <Icon name={showPw ? "eyeOff" : "eye"} size={18} />
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-error-text">{error}</p>}

          <Button type="submit" variant="primary" className="w-full" loading={loading}>
            {t("submit")}
          </Button>
        </form>

        <p className="mt-8 text-center text-[10px] text-muted-2 opacity-50">{t("noSignup")}</p>
      </div>
    </div>
  );
}
