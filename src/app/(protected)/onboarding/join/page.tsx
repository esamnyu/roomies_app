'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '@/lib/api';

export default function JoinHouseholdPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) {
      toast.error('Please enter a join code.');
      return;
    }
    setIsLoading(true);

    try {
      const household = await api.joinHouseholdWithCode(code.trim());
      toast.success(`Successfully joined ${household.name}!`);
      router.refresh();
      router.push(`/household/${household.id}/expenses`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to join household. Please check the code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout
      title="Join a Household"
      showBack={true}
      onBack={() => router.push('/onboarding')}
    >
      <div className="mx-auto max-w-xl">
        <p className="mb-8 text-center text-muted-foreground">
          Enter the unique code provided by your roommate to join their
          household.
        </p>
        <form onSubmit={handleJoinSubmit} className="flex items-start gap-2">
          <Input
            type="text"
            placeholder="Enter join code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-grow"
            required
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Join'
            )}
          </Button>
        </form>
      </div>
    </Layout>
  );
}