import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { LiquidBackground } from "@/components/ui/LiquidBackground";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { InstallAppButton } from "@/components/ui/InstallAppButton";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const metadata: Metadata = {
  title: "WispEcho — chat that actually hits",
  description: "Real-time messaging, but make it premium.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${space.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'dark';
                  if (theme === 'light') {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className="antialiased">
        <LiquidBackground>
          <Providers>
            {children}
            <CommandPalette />
            <InstallAppButton />
          </Providers>
        </LiquidBackground>
      </body>
    </html>
  );
}
