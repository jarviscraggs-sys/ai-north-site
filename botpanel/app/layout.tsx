import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clayo — AI-powered customer assistant for your business",
  description: "Clayo gives your business an AI assistant that handles bookings, answers questions and captures leads 24/7 — on WhatsApp or Telegram",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-900 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
