
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Mulgymo Lab Scan",
    template: "%s | Mulgymo Lab Scan",
  },
  description:
    "Mulgymo Lab Scan. Un laboratorio de historias, traducciones y nuevos universos por descubrir.",
  applicationName: "Mulgymo Lab Scan",
  keywords: [
    "Mulgymo Lab Scan",
    "Manga",
    "Manhwa",
    "Scanlation",
    "Traducciones",
  ],
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="lab-background">
          <Suspense fallback={null}>
            <Sidebar />
          </Suspense>

          <div className="lab-content min-h-screen pt-6">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
