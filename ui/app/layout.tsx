
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { ProjectProvider } from "@/lib/context/project-context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
// FIXME  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2ZVRoU1pnPT06ODNkOTQ0MmY=

export const metadata: Metadata = {
  title: "智能体测试系统",
  description: "面向测试设计、自动执行、失败分析与修复闭环的智能体测试系统",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/brand-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ProjectProvider>
          <LanguageProvider>
            <NuqsAdapter>{children}</NuqsAdapter>
            <Toaster />
          </LanguageProvider>
        </ProjectProvider>
      </body>
    </html>
  );
}

// eslint-disable  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2ZVRoU1pnPT06ODNkOTQ0MmY=
