import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { HouseholdMember } from '@/lib/types/types';

export const useHouseholdMembers = (householdId: string | null) => {
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!householdId) {
        setMembers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('household_members')
          .select('*, profiles:user_id(*)')
          .eq('household_id', householdId)
          .order('joined_at', { ascending: true });

        if (error) {
          console.error('Failed to fetch household members:', error);
          setError(error);
        } else {
          setMembers(data as HouseholdMember[] || []);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch members');
        console.error('Failed to fetch household members:', error);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [householdId]);

  return { members, loading, error };
};