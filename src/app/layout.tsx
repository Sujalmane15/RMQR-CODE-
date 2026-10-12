import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Urban Mart — CRM & Supermarket Management POS",
  description:
    "Production-Ready Supermarket ERP, Multi-Counter POS Billing, GRN Inward, Real-Time Stock Ledger, Indian GST & Thermal Printing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-100">{children}</body>
    </html>
  );
}
