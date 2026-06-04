import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lotto Win - Lottery Platform",
  description: "Win big with Lotto Win - Bangladesh's favorite lottery platform",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-dark text-white min-h-screen">
        <div className="relative">
          <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-dark to-dark pointer-events-none" />
          <div className="relative z-10">{children}</div>
        </div>
      </body>
    </html>
  );
}