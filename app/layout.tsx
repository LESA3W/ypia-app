import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { GridPattern } from "@/components/ui/grid-pattern";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ypia — console bot",
  description: "Pilotage et observation du bot Telegram advisor.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ypia",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "ypia — console bot",
    description: "Pilotage et observation du bot Telegram advisor.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ypia — console bot",
    description: "Pilotage et observation du bot Telegram advisor.",
  },
};

export const viewport: Viewport = {
  themeColor: "#eef4fc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>
          <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <GridPattern
              width={46}
              height={46}
              className="fill-foreground/[0.018] stroke-foreground/[0.05] [mask-image:radial-gradient(125%_100%_at_50%_0%,#000_45%,transparent_100%)]"
            />
            <GridPattern
              width={46}
              height={46}
              squares={[
                [3, 2],
                [7, 4],
                [12, 3],
                [5, 8],
                [15, 7],
                [9, 11],
                [2, 13],
              ]}
              className="fill-copper/[0.07] stroke-copper/0 [mask-image:radial-gradient(440px_circle_at_50%_-5%,#000,transparent)]"
            />
          </div>
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
