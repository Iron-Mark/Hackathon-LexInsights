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
import {
  buildBaseStructuredData,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/seo";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "LexInsights",
    "Philippine legal research",
    "Philippine compliance assistant",
    "legal compliance chat",
    "RAG legal research",
    "document compliance review",
    "RA 10173",
    "RA 10175",
    "RA 9160",
    "RA 9775",
  ],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "Legal technology",
  classification: "Philippine legal compliance assistant",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: "LexInsights",
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
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    images: [
      {
        url: SITE_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "LexInsights Philippine legal compliance assistant",
      },
    ],
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE],
  },
  other: {
    "geo.region": "PH",
    "geo.placename": "Philippines",
    "og:country-name": "Philippines",
    "application-name": SITE_NAME,
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildBaseStructuredData()) }}
        />
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
