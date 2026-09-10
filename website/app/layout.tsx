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
  title: "PortShare — Expose localhost with a public URL in seconds",
  description:
    "PortShare is a fast, developer-first tunnel client. Get a permanent public subdomain for your local dev server in seconds. Custom domains, webhook inspector, zero friction.",
  keywords: [
    "localhost tunnel",
    "ngrok alternative",
    "port forwarding",
    "local to public URL",
    "webhook testing",
    "developer tools",
  ],
  openGraph: {
    title: "PortShare — Expose localhost with a public URL in seconds",
    description:
      "Fast, developer-first tunnel client. Permanent subdomains, custom domains, webhook inspector.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
