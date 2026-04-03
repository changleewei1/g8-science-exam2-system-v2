import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_TC({
  subsets: ["latin"],
  variable: "--font-noto-sans-tc",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "國二理化第二次段考預習觀看系統 v2",
  description: "國二理化第二次段考｜影片觀看進度與AI學習診斷",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f8fb",
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
