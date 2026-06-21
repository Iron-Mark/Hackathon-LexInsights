import type { Metadata, Viewport } from "next";
import { Manrope, Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { ClerkAuthHeader } from "@/components/auth/clerk-auth-header";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { ToastContainer } from "@/components/ui/toast";
import { isClerkClientConfigured } from "@/lib/auth/clerk-config";
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

export const metadata: Metadata = {
  title: "LexInSight - Philippine Legal Compliance Assistant",
  description: "Your Philippine legal research and compliance assistant",
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
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkClientConfigured = isClerkClientConfigured();

  return (
    <html lang="en" className={`${manrope.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        {clerkClientConfigured ? (
          <ClerkProvider>
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
      </body>
    </html>
  );
}
