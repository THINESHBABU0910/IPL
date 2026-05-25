import type { Metadata, Viewport } from "next";
import "./globals.css";
import KeepAliveProvider from "@/components/KeepAliveProvider";

export const metadata: Metadata = {
  title: "IPL 2026 Auction Game",
  description: "Play IPL 2026 Auction with friends — real-time multiplayer bidding",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ipl-dark antialiased">
        <KeepAliveProvider>{children}</KeepAliveProvider>
      </body>
    </html>
  );
}
