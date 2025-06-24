'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
// FIX 1: Use a default import (no curly braces)
import HouseholdChat from '@/components/HouseholdChat';
import * as api from '@/lib/api';
import toast from 'react-hot-toast';
import { Profile } from '@/lib/types/types';
import { Loader2 } from 'lucide-react';

export default function ChatPage() {
  const params = useParams();
  const householdId = params.id as string;

  // FIX 2: Fetch the members needed by the HouseholdChat component
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!householdId) return;
    try {
      setLoading(true);
      const membersData = await api.getHouseholdMembers(householdId);
      // The chat component needs the Profile, not the HouseholdMemberWithProfile
      setMembers(membersData.map(m => m.profiles));
    } catch (error) {
      toast.error("Failed to load household members for chat.");
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    // FIX 2: Pass the required 'members' prop to the component
    <HouseholdChat householdId={householdId} members={members} />
  );
}