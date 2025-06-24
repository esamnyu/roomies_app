'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as api from '@/lib/api';
import toast from 'react-hot-toast';
import { Layout } from '@/components/Layout';
import { Household, Profile } from '@/lib/types/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Loader2, Users, PlusCircle } from 'lucide-react';
import { ProfileModal } from '@/components/ProfileModal';
import { useAuth } from '@/components/AuthProvider';

// --- Helper Components for a Cleaner Layout ---

// Component for displaying a single household
function HouseholdCard({ household }: { household: Household }) {
  const router = useRouter();
  return (
    <Card
      key={household.id}
      className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-1"
      onClick={() => router.push(`/household/${household.id}/expenses`)}
    >
      <CardHeader>
        <CardTitle>{household.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center text-muted-foreground">
          <Users className="mr-2 h-4 w-4" />
          <span>
            {household.member_count} member
            {household.member_count !== 1 ? 's' : ''}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// Component for the "Join or Create" card
function AddHouseholdCard() {
  const router = useRouter();
  return (
    <Card
      className="flex cursor-pointer flex-col items-center justify-center border-2 border-dashed bg-muted/50 p-6 transition-colors hover:border-primary hover:bg-muted"
      onClick={() => router.push('/onboarding')}
    >
      <PlusCircle className="mb-2 h-8 w-8 text-muted-foreground" />
      <span className="text-center font-semibold text-muted-foreground">
        Join or Create Household
      </span>
    </Card>
  );
}

// --- Main Dashboard Page Component ---

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const loadHouseholds = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.getUserHouseholds();
      setHouseholds(data);

      if (data.length === 0) {
        router.push('/onboarding');
      }
    } catch (error) {
      console.error('Error loading households:', error);
      toast.error('Failed to load your households.');
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  useEffect(() => {
    loadHouseholds();
  }, [loadHouseholds]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Layout
        title="My Households"
        onShowProfile={() => setIsProfileModalOpen(true)}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {households.map((household) => (
            <HouseholdCard key={household.id} household={household} />
          ))}
          <AddHouseholdCard />
        </div>
      </Layout>

      {profile && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          profile={profile as Profile}
        />
      )}
    </>
  );
}