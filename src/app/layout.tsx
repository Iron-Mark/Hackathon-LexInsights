import type { Metadata, Viewport } from "next";
import { Manrope, Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { ClerkAuthHeader } from "@/components/auth/clerk-auth-header";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { ToastContainer } from "@/components/ui/toast";
import { authFormAppearance } from "@/lib/auth/clerk-appearance";
import { getClerkSetupStatus } from "@/lib/auth/clerk-config";
import { AuthSetupProvider } from "@/components/providers/auth-setup-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { themeInitScript } from "@/lib/theme";

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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lexiph.vercel.app";
const appTitle = "LexInSight - Philippine Legal Compliance Assistant";
const appDescription = "Your Philippine legal research and compliance assistant";
const ogImage = "/og/lexinsight-og.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: appTitle,
  description: appDescription,
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
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo/LOGO-0.5-woBG.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: appTitle,
    description: appDescription,
    url: "/",
    siteName: "LexInSight",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "LexInSight Philippine legal compliance assistant",
      },
    ],
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: appTitle,
    description: appDescription,
    images: [ogImage],
  },
};

export const viewport: Viewport = {
  themeColor: '#3F33BD',
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkSetup = getClerkSetupStatus();

  return (
    <html lang="en" className={`${manrope.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <AuthSetupProvider
          value={{
            clerkConfigured: clerkSetup.configured,
            clerkClientConfigured: clerkSetup.clientConfigured,
            missingClerkKeys: clerkSetup.missingKeys,
          }}
        >
          {clerkSetup.configured ? (
            <ClerkProvider appearance={authFormAppearance}>
              <ThemeProvider>
                <SessionProvider>
                  <ServiceWorkerRegistration />
                  <ClerkAuthHeader />
                  {children}
                  <ToastContainer />
                </SessionProvider>
              </ThemeProvider>
            </ClerkProvider>
          ) : (
            <ThemeProvider>
              <ServiceWorkerRegistration />
              {children}
              <ToastContainer />
            </ThemeProvider>
          )}
        </AuthSetupProvider>
      </body>
    </html>
  );
}
