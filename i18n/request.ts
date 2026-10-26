import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALES, type Locale } from "@/lib/i18n-config";

function fromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase();
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return null;
}

export default getRequestConfig(async () => {
  // resolution order: cookie > Accept-Language > default
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  let locale: Locale = DEFAULT_LOCALE;
  if (isLocale(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const headerStore = await headers();
    locale = fromAcceptLanguage(headerStore.get("accept-language")) ?? DEFAULT_LOCALE;
  }

  // ensure locale is valid (defensive)
  if (!LOCALES.includes(locale)) locale = DEFAULT_LOCALE;

  const messages = (await import(`@/messages/${locale}.json`)).default;
  return { locale, messages };
});
