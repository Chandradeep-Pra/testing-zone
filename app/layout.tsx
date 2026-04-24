import type { Metadata } from "next";
import { IBM_Plex_Mono, Sora } from "next/font/google";
import "./globals.css";
import ToasterProvider from "@/components/ToastProvider";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

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
      <body
        className={`${sora.variable} ${plexMono.variable} dark antialiased`}
      >
        {children}
        <ToasterProvider />
      </body>
    </html>
  );
}
