import type { Metadata } from "next";
import "./globals.css";
import ToasterProvider from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: {
    default: "Urologics",
    template: "%s | Urologics",
  },
  description:
    "Premium AI viva, mock exam, and grand mock preparation for urology training with Urologics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="dark antialiased">
        {children}
        <ToasterProvider />
      </body>
    </html>
  );
}
