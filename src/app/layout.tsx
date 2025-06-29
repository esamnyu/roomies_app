import React from 'react';
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AsyncErrorBoundary } from "@/components/AsyncErrorBoundary";

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
        <ErrorBoundary showReportButton={true}>
          <AsyncErrorBoundary>
            <AuthProvider>
              {children}
            </AuthProvider>
          </AsyncErrorBoundary>
        </ErrorBoundary>
      </body>
    </html>
  );
}