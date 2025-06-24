'use client';

import { useParams } from 'next/navigation';
import { RulesEditor } from '@/components/RulesEditor';

export default function RulesPage() {
  const params = useParams();
  const householdId = params.id as string;

  // This page simply renders the self-contained RulesEditor component,
  // passing it the householdId from the URL.
  return <RulesEditor householdId={householdId} />;
}