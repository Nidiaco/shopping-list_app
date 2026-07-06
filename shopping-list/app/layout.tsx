import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shopping List",
  description: "Smart shopping list with category detection",
  applicationName: "Shopping List",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Shopping List",
  },
  icons: {
    icon: [
      {
        url: "/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        url: "/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
    apple: "/icon-192.svg",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
