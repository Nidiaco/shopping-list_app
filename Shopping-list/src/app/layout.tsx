import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Household Shopping List",
  description: "Shared household shopping list with Pak'nSave Wainoni price lookup",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
