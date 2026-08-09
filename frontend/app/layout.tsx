import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { LiquidBackground } from "@/components/ui/LiquidBackground";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { InstallAppButton } from "@/components/ui/InstallAppButton";
import { UpdateChecker } from "@/components/ui/UpdateChecker";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata:Metadata = {
  metadataBase: new URL("https://wispecho.com"),
  title: {
    default: "WispEcho — Next-Gen Encrypted Real-Time Messaging & Chat App",
    template: "%s | WispEcho Chat",
  },
  description:
    "WispEcho is a ultra-fast, privacy-first, next-generation real-time chat application featuring view-once media, end-to-end speed, customizable themes, and cross-platform Android & Web apps.",
  keywords: [
    "WispEcho",
    "Wisp Echo",
    "real time chat app",
    "encrypted messaging app",
    "view once chat",
    "privacy chat app",
    "Gen Z messaging app",
    "secure instant messaging",
    "Cloudinary chat app",
    "WispEcho APK download",
    "best chat app 2026",
  ],
  authors: [{ name: "WispEcho Team" }],
  creator: "WispEcho",
  publisher: "WispEcho",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "WispEcho — Next-Gen Real-Time Messaging",
    description: "Ultra-fast, privacy-first messaging with View Once media, customizable themes, and APK downloads.",
    url: "https://wispecho.com",
    siteName: "WispEcho",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "WispEcho Real-Time Messaging App Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WispEcho — Real-Time Chat App",
    description: "Ultra-fast, privacy-first messaging with View Once media & customizable themes.",
    creator: "@wispecho",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://wispecho.com",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${space.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "WispEcho",
              operatingSystem: "ANDROID, WEB",
              applicationCategory: "CommunicationApplication",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              description: "WispEcho is a next-generation real-time encrypted messaging application featuring view-once media, customizable themes, and cross-platform native Android and Web apps.",
              softwareVersion: "1.2.0",
              downloadUrl: "https://wispecho.com/download",
              publisher: {
                "@type": "Organization",
                name: "WispEcho",
              },
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var themeId = localStorage.getItem('wispecho-theme') || 'default';
                  // For preset themes, we just need to set the light class — 
                  // the CSS vars will be applied by JS on hydration.
                  // But we prevent FOUC by at least applying the correct class.
                  var lightThemes = ['light', 'sakura'];
                  if (lightThemes.indexOf(themeId) !== -1) {
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
            <UpdateChecker />
          </Providers>
        </LiquidBackground>
      </body>
    </html>
  );
}
