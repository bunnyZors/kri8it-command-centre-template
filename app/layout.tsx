import type { Metadata } from "next";
import "./globals.css";
import { instance } from "@/lib/instance.mjs";

export const metadata: Metadata = {
  title: instance.appName,
  description: "A private, email-triaged task board.",
  icons: {
    icon: "/brand/kri8it-logomark.png",
    shortcut: "/brand/kri8it-logomark.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head><link rel="preload" href="/fonts/InterVariable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" /></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
