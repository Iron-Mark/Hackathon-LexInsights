import type { Metadata } from "next";
import { Manrope, Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { ClerkAuthHeader } from "@/components/auth/clerk-auth-header";
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
  icons: {
    icon: "/logo/LOGO-0.5-woBG.svg",
  },
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
              <ClerkAuthHeader />
              {children}
              <ToastContainer />
            </SessionProvider>
          </ClerkProvider>
        ) : (
          <>
            {children}
            <ToastContainer />
          </>
        )}
      </body>
    </html>
  );
}
