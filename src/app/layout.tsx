import type { Metadata, Viewport } from "next";
import "./globals.css";
import KeepAliveProvider from "@/components/KeepAliveProvider";

export const metadata: Metadata = {
  title: "Cricket Auction Live",
  description: "IPL, WPL, BBL, SA20, The Hundred & Legend mode — real-time multiplayer cricket auctions",
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
