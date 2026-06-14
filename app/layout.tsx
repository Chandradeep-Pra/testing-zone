import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import ToasterProvider from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: {
    default: "Urologics Web",
    template: "%s | Urologics Web",
  },
  description:
    "Premium AI viva, mock exam, and grand mock preparation for urology training with Urologics.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
        <ToasterProvider />
      </body>
    </html>
  );
}
