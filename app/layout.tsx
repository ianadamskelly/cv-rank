import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CV Rank | Kuza Kizazi",
  description: "Check your CV readiness with practical, profile-specific feedback.",
  icons: {
    icon: "/favicon.png",
    apple: "/icon.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
