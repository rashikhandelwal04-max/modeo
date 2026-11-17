import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store/state";
import ToastHost from "@/components/ToastHost";

export const metadata: Metadata = {
  title: "MODEO — Your wardrobe. Your style. Reimagined.",
  description: "MODEO is an AI personal stylist that styles what you own, not just what you can buy.",
};

export const viewport: Viewport = { themeColor: "#0f0f0f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Jost:wght@300;400;500&display=swap"
        />
      </head>
      <body>
        <AppProvider>
          {children}
          <ToastHost />
        </AppProvider>
      </body>
    </html>
  );
}
