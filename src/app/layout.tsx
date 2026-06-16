import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ReportGen – Field Report Generator",
  description:
    "Capture photos, add remarks, and generate professional PowerPoint reports in minutes. Built for field engineers, QA inspectors, and construction supervisors.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "ReportGen" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  keywords: ["field report", "photo report", "ppt generator", "inspection", "QA", "construction"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fa" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen flex flex-col antialiased tap-highlight overflow-x-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="top-center"
            richColors
            toastOptions={{ duration: 3000 }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
