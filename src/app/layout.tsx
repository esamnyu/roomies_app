import React from 'react';
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { UnifiedErrorBoundary } from "@/components/ErrorBoundary/UnifiedErrorBoundary";

// Setup for the new primary font
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Roomies - Shared Living Made Simple",
  description: "Manage expenses and tasks with your roommates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} font-sans antialiased`}>
        <UnifiedErrorBoundary showReportButton={true} autoRetry={true}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </UnifiedErrorBoundary>
      </body>
    </html>
  );
}