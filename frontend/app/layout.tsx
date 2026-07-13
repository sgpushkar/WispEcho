import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { LiquidBackground } from "@/components/ui/LiquidBackground";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const metadata: Metadata = {
  title: "WispEcho — chat that actually hits",
  description: "Real-time messaging, but make it premium.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${space.variable}`}>
      <body className="antialiased">
        <LiquidBackground>
          <Providers>{children}</Providers>
        </LiquidBackground>
      </body>
    </html>
  );
}
