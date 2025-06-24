'use client';

import { useRouter } from 'next/navigation';
import { LandingPageContent } from '@/components/LandingPageContent';

export default function HomePage() {
  const router = useRouter();

  // This component now directly renders the landing page content
  // and uses the Next.js router for navigation, replacing the old
  // state-based navigation system.
  return (
    <LandingPageContent
      onSignIn={() => router.push('/signin')}
      onSignUp={() => router.push('/signup')}
    />
  );
}