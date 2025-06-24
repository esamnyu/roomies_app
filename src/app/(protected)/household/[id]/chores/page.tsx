'use client';

import { useParams } from 'next/navigation';
import { ChoreDashboard } from '@/components/ChoreDashboard';

export default function ChoresPage() {
  const params = useParams();
  const householdId = params.id as string;

  // This page component simply acts as a container for the ChoreDashboard,
  // passing it the necessary householdId from the URL.
  // The ChoreDashboard component handles all of its own data fetching and logic.
  return <ChoreDashboard householdId={householdId} />;
}