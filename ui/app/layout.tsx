
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/providers/LanguageProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
// FIXME  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2ZVRoU1pnPT06ODNkOTQ0MmY=

export const metadata: Metadata = {
  title: "测试平台",
  description: "AI 驱动的智能测试系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <LanguageProvider>
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}

// eslint-disable  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2ZVRoU1pnPT06ODNkOTQ0MmY=
