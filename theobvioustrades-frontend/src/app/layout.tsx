import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "../components/shell/Sidebar";
import { Header } from "../components/shell/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Obvious Trades",
  description: "Personal portfolio & analytics dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-neutral-900`}
      >
        <div className="flex min-h-screen">
          {/* Left navigation */}
          <Sidebar />

          {/* Right side (header + content) */}
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

