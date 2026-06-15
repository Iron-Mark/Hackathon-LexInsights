import type { Metadata, Viewport } from "next";
import { Manrope, Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { ClerkAuthHeader } from "@/components/auth/clerk-auth-header";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { ToastContainer } from "@/components/ui/toast";
import { isClerkConfigured } from "@/lib/auth/clerk-config";

// Manrope - Body font
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

// Outfit - Display/Heading font
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LexInsight - Philippine Legal Compliance Assistant",
  description: "Your AI-powered Philippine legal compliance assistant",
  applicationName: "LexInSight",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "LexInSight",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/logo/LOGO-0.5-woBG.svg",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: '#3F33BD',
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkConfigured = isClerkConfigured();

  return (
    <html lang="en" className={`${manrope.variable} ${outfit.variable}`}>
      <body className="antialiased">
        {clerkConfigured ? (
          <ClerkProvider>
            <SessionProvider>
              <ServiceWorkerRegistration />
              <ClerkAuthHeader />
              {children}
              <ToastContainer />
            </SessionProvider>
          </ClerkProvider>
        ) : (
          <>
            <ServiceWorkerRegistration />
            {children}
            <ToastContainer />
          </>
        )}
      </body>
    </html>
  );
}
