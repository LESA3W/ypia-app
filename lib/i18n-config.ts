export const LOCALES = ["en", "fr", "de", "es", "it", "uk", "ru", "ja", "zh", "ko"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Each language displayed natively in its own language. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
  uk: "Українська",
  ru: "Русский",
  ja: "日本語",
  zh: "中文",
  ko: "한국어",
};

export const LOCALE_COOKIE = "locale";

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}
