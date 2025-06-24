'use client';

import { useRouter } from 'next/navigation';
import { OnboardingChoice } from '@/components/OnboardingChoice';
import { Layout } from '@/components/Layout';

export default function OnboardingPage() {
  const router = useRouter();

  return (
    <Layout title="Welcome to Roomies!">
      <div className="mx-auto max-w-xl text-center">
        <p className="mb-8 text-lg text-muted-foreground">
          You're not part of any household yet. Get started by creating a new
          one for your crew or joining one that's already set up.
        </p>
        <OnboardingChoice
          onCreateHousehold={() => router.push('/onboarding/create')}
          onJoinHousehold={() => router.push('/onboarding/join')}
        />
      </div>
    </Layout>
  );
}