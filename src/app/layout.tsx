import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Altara Energy Network",
  description: "Private solar audit, equipment recommendation, quote, and invoice system.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
