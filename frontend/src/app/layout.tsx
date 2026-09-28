import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "RTB Portal — Intelligent Call Routing & Lead Distribution",
  description: "Enterprise Real-Time Bidding, Buyer Routing, and CRM Analytics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="kukie-bg text-slate-900 antialiased font-sans selection:bg-[#1c2434] selection:text-white min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
