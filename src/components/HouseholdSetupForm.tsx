// src/components/HouseholdSetupForm.tsx
'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthProvider'; // Assuming AuthProvider is in the components folder
import * as api from '@/lib/api';
import { useRouter } from 'next/navigation'; // For Next.js App Router

interface HouseholdSetupFormProps {
  onHouseholdCreated: (householdId: string) => void;
}

export const HouseholdSetupForm: React.FC<HouseholdSetupFormProps> = ({ onHouseholdCreated }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [householdName, setHouseholdName] = useState('');
  const [memberCount, setMemberCount] = useState(2);
  const [coreChores, setCoreChores] = useState('');
  const [choreFrequency, setChoreFrequency] = useState('Weekly');
  const [choreFramework, setChoreFramework] = useState('Split'); // Or useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to create a household.');
      return;
    }
    if (!householdName.trim()) {
      setError('Household name is required.');
      return;
    }
    if (memberCount < 1) { // Allowing solo households for now, can be changed to 2
        setError('Household must have at least 1 member.');
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params: api.CreateHouseholdParams = {
        name: householdName,
        member_count: memberCount,
        core_chores: coreChores.trim() || undefined,
        chore_frequency: choreFrequency || undefined,
        chore_framework: choreFramework.trim() || undefined,
      };
      const newHousehold = await api.createHousehold(params);
      if (newHousehold) {
        onHouseholdCreated(newHousehold.id); // Callback to notify parent
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create household.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Set Up Your Household</h2>
      {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="householdName" className="block text-sm font-medium text-gray-700">
            Household Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="householdName"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="e.g., The Cozy Corner, Apartment 10B"
          />
        </div>

        <div>
          <label htmlFor="memberCount" className="block text-sm font-medium text-gray-700">
            Target Number of Members <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="memberCount"
            value={memberCount}
            onChange={(e) => setMemberCount(parseInt(e.target.value, 10))}
            min="1"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="coreChores" className="block text-sm font-medium text-gray-700">
            Core Chores (Optional)
          </label>
          <textarea
            id="coreChores"
            value={coreChores}
            onChange={(e) => setCoreChores(e.target.value)}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="e.g., Cleaning Bathroom, Taking out trash, Washing dishes (comma-separated)"
          />
        </div>

        <div>
          <label htmlFor="choreFrequency" className="block text-sm font-medium text-gray-700">
            Frequency of Chores (Optional)
          </label>
          <select
            id="choreFrequency"
            value={choreFrequency}
            onChange={(e) => setChoreFrequency(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="Weekly">Weekly</option>
            <option value="Bi-weekly">Bi-weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="As needed">As needed</option>
          </select>
        </div>

        <div>
        <label htmlFor="choreFramework" className="block text-sm font-medium text-gray-700">
            Framework for Chore Doing <span className="text-red-500">*</span> {/* Consider if this should be optional or required */}
        </label>
        <select
            id="choreFramework"
            value={choreFramework}
            onChange={(e) => setChoreFramework(e.target.value)}
            required // Add required if this field is mandatory
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
            {/* Optional: Add a default placeholder option if state is initialized to '' */}
            {/* <option value="" disabled>Select a framework</option> */}
            <option value="Split">Split</option>
            <option value="One person army">One person army</option>
            {/* You can add more predefined options here in the future if needed */}
        </select>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create Household'}
        </button>
      </form>
    </div>
  );
};