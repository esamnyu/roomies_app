// src/components/OnboardingChoice.tsx
'use client';

import React from 'react';

interface OnboardingChoiceProps {
  onCreateHousehold: () => void;
  onJoinHousehold: () => void; // For MVP, this might navigate to invitations tab or show info
}

export const OnboardingChoice: React.FC<OnboardingChoiceProps> = ({
  onCreateHousehold,
  onJoinHousehold,
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-3xl font-bold text-emerald-800 mb-4">Welcome to Roomies!</h1>
        <p className="text-gray-700 mb-8">
          You're almost there! To get started, you can either create a new household
          or join an existing one if you have an invitation.
        </p>
        <div className="space-y-4">
          <button
            onClick={onCreateHousehold}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 px-6 rounded-md text-lg font-medium"
          >
            Create New Household
          </button>
          <button
            onClick={onJoinHousehold}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-6 rounded-md text-lg font-medium"
          >
            Join Existing Household
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-6">
          If you're joining a household, you'll need an invitation from an existing member.
          Check your pending invitations or ask your household admin.
        </p>
      </div>
    </div>
  );
};