import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI North — Business AI Consultancy",
  description: "Your business has problems. AI can fix them. Expert AI consultancy in the North of England.",
  keywords: "AI consultancy, business automation, AI North, artificial intelligence, automation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
