'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import {
  useParams,
  usePathname,
  useRouter,
} from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import * as api from '@/lib/api';
import toast from 'react-hot-toast';
import { Household } from '@/lib/types/types';
import {
  DollarSign,
  ClipboardList,
  MessageSquare,
  LifeBuoy,
  Loader2,
} from 'lucide-react';

// A small helper component for the navigation tabs
function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-secondary-foreground hover:border-border hover:text-foreground'
      }`}
    >
      {children}
    </Link>
  );
}

export default function HouseholdLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();

  // The household ID is retrieved from the URL params
  const householdId = params.id as string;

  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHousehold = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      const data = await api.getHouseholdDetails(householdId);
      setHousehold(data);
    } catch (error) {
      toast.error('Failed to load household details.');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [householdId, router]);

  useEffect(() => {
    loadHousehold();
  }, [loadHousehold]);

  // Determine which tab is active based on the current URL
  const activeTab = pathname.includes('/expenses')
    ? 'money'
    : pathname.includes('/chores')
    ? 'chores'
    : pathname.includes('/chat')
    ? 'communication'
    : pathname.includes('/rules')
    ? 'rules'
    : 'money'; // Default to money

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Layout
      title={household?.name || 'Household'}
      showBack
      onBack={() => router.push('/dashboard')}
      isHouseholdView={true}
    >
      <div className="space-y-6">
        <div className="border-b border-border">
          <nav className="-mb-px flex space-x-6">
            <TabLink
              href={`/household/${householdId}/expenses`}
              active={activeTab === 'money'}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Money
            </TabLink>
            <TabLink
              href={`/household/${householdId}/chores`}
              active={activeTab === 'chores'}
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              Chores
            </TabLink>
            <TabLink
              href={`/household/${householdId}/chat`}
              active={activeTab === 'communication'}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Communication
            </TabLink>
            <TabLink
              href={`/household/${householdId}/rules`}
              active={activeTab === 'rules'}
            >
              <LifeBuoy className="mr-2 h-4 w-4" />
              Rules
            </TabLink>
          </nav>
        </div>
        
        {/* The content for each tab will be rendered here */}
        {children}
      </div>
    </Layout>
  );
}