import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store/state";
import ToastHost from "@/components/ToastHost";

export const metadata: Metadata = {
  title: "MY GALA — Your style. Your stage.",
  description: "MY GALA — a personal fashion universe where you discover, create and reimagine your own style.",
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Inter:wght@300;400;500&family=Montserrat:wght@300;400;500;600&display=swap"
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
