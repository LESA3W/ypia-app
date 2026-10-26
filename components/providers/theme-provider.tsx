"use client";

import { useEffect } from "react";
import { ThemeProvider as NextThemes, useTheme } from "next-themes";

function FaviconSwitcher() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (!resolvedTheme) return;
    const href = resolvedTheme === "dark" ? "/favicon-dark.png" : "/favicon-light.png";
    const links = document.querySelectorAll('link[rel~="icon"]');
    if (links.length) {
      links.forEach((l) => l.setAttribute("href", href));
    } else {
      const l = document.createElement("link");
      l.setAttribute("rel", "icon");
      l.setAttribute("type", "image/png");
      l.setAttribute("href", href);
      document.head.appendChild(l);
    }
  }, [resolvedTheme]);
  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="data-theme" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <FaviconSwitcher />
      {children}
    </NextThemes>
  );
}
