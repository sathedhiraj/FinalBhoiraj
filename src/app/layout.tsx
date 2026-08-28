import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Ganesh Mandal — Management & Accounting",
  description:
    "Manage your Ganesh Mandal festivals, income, expenses, donors, receipts and reports — all in one place.",
  keywords: ["Ganesh Mandal", "Ganesh Utsav", "Accounting", "Vargani", "Festival Management"],
  icons: { icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f97316",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <Providers>{children}</Providers>
        <Toaster />
        <SonnerToaster position="top-center" />
      </body>
    </html>
  );
}
