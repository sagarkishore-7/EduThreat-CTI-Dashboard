import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduThreat-CTI | Cyber Threat Intelligence for Education",
  description: "Real-time cyber threat intelligence dashboard for the global education sector. Track incidents, threat actors, and ransomware campaigns targeting universities and schools.",
  keywords: ["cyber security", "threat intelligence", "education", "ransomware", "CTI", "university", "school", "data breach"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          <ErrorBoundary>
            <LayoutWrapper>{children}</LayoutWrapper>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
