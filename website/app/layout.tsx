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
  title: "PortShare — Public URLs for localhost",
  description:
    "Expose your local development server with a permanent HTTPS subdomain. Desktop client, request inspector, and custom domains.",
  keywords: [
    "localhost tunnel",
    "ngrok alternative",
    "port forwarding",
    "local to public URL",
    "webhook testing",
    "developer tools",
  ],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "PortShare — Public URLs for localhost",
    description:
      "Permanent HTTPS subdomains for local development. Desktop client and request inspector included.",
    type: "website",
  },
};

const themeScript = `(function(){try{var t=localStorage.getItem('portshare-web-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}else{document.documentElement.dataset.theme=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className={geistSans.className}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
