import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC } from "next/font/google";
import {
  SITE_BRAND,
  SITE_DEFAULT_URL,
  SITE_DESCRIPTION,
  SITE_TITLE,
  SITE_TITLE_FULL,
} from "@/lib/site-metadata";
import "./globals.css";

const noto = Noto_Sans_TC({
  subsets: ["latin"],
  variable: "--font-noto-sans-tc",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_DEFAULT_URL),
  title: {
    default: SITE_TITLE_FULL,
    template: `%s｜${SITE_TITLE}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_TITLE,
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "/",
    siteName: SITE_BRAND,
    title: SITE_TITLE_FULL,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/mingguan-logo.png",
        width: 512,
        height: 512,
        alt: SITE_TITLE_FULL,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE_FULL,
    description: SITE_DESCRIPTION,
    images: ["/mingguan-logo.png"],
  },
  appleWebApp: {
    capable: true,
    title: SITE_TITLE,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050810",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`${noto.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-[100dvh] flex-col pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)]"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
