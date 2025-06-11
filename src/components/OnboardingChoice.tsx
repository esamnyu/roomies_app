// src/components/OnboardingChoice.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';

interface OnboardingChoiceProps {
  onCreateHousehold: () => void;
  onJoinHousehold: () => void;
}

export const OnboardingChoice: React.FC<OnboardingChoiceProps> = ({
  onCreateHousehold,
  onJoinHousehold,
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-3xl font-bold text-primary mb-4">Welcome to Roomies!</h1>
        <p className="text-foreground mb-8">
          You&apos;re almost there! To get started, you can either create a new household
          or join an existing one if you have an invitation.
        </p>
        <div className="space-y-4">
          <Button
            onClick={onCreateHousehold}
            size="lg"
            className="w-full"
          >
            Create New Household
          </Button>
          <Button
            onClick={onJoinHousehold}
            variant="secondary"
            size="lg"
            className="w-full"
          >
            Join Existing Household
          </Button>
        </div>
        <p className="text-xs text-secondary-foreground opacity-70 mt-6">
          If you&apos;re joining a household, you&apos;ll need an invitation from an existing member.
          Check your pending invitations or ask your household admin.
        </p>
      </div>
    </div>
  );
};
