'use client';

import { useRouter } from 'next/navigation';
import { HouseholdSetupForm } from '@/components/HouseholdSetupForm';
import { Layout } from '@/components/Layout';

export default function CreateHouseholdPage() {
  const router = useRouter();

  const handleHouseholdCreated = (householdId: string) => {
    router.refresh();
    router.push(`/household/${householdId}/expenses`);
  };

  return (
    <Layout
      title="Create Your Household"
      showBack={true}
      onBack={() => router.push('/onboarding')}
    >
      <div className="mx-auto max-w-xl">
        <p className="mb-8 text-center text-muted-foreground">
          Give your new shared space a name. You can invite your roommates in
          the next step.
        </p>
        <HouseholdSetupForm
          onHouseholdCreated={handleHouseholdCreated}
          // FIX: Add the required onCancel prop
          onCancel={() => router.push('/onboarding')}
        />
      </div>
    </Layout>
  );
}