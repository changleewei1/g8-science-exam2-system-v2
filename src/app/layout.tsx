import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_TC({
  subsets: ["latin"],
  variable: "--font-noto-sans-tc",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "國中理化 AI 智慧學習測試系統｜名貫補習班",
  description: "結合 AI 技術的國中理化學習平台｜精準診斷、個人化學習、智慧追蹤",
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
