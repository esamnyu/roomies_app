// src/components/HouseholdSetupForm.tsx
'use client';

import React, { useState } from 'react';
import Select, { MultiValue } from 'react-select';
import { useAuth } from './AuthProvider';
import { createHousehold } from '@/lib/api/households';
import type { CreateHouseholdParams } from '@/lib/types/types';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';

interface HouseholdSetupFormProps {
  onHouseholdCreated: (householdId: string) => void;
}

interface ChoreOptionType {
  value: string;
  label: string;
}

export const HouseholdSetupForm: React.FC<HouseholdSetupFormProps> = ({ onHouseholdCreated }) => {
  const { user } = useAuth();
  const [householdName, setHouseholdName] = useState('');
  const [memberCount, setMemberCount] = useState(2);
  const [coreChores, setCoreChores] = useState<string[]>([]);
  const [choreFrequency, setChoreFrequency] = useState('Weekly');
  const [choreFramework, setChoreFramework] = useState('Split');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const AVAILABLE_CORE_CHORES_LIST = [
    "Kitchen cleaning",
    "Living room cleaning",
    "Taking out trash",
    "Bathroom cleaning"
  ];

  const reactSelectChoreOptions: ChoreOptionType[] = AVAILABLE_CORE_CHORES_LIST.map(chore => ({
    value: chore,
    label: chore,
  }));

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
    if (memberCount < 1) {
      setError('Household must have at least 1 member.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params: CreateHouseholdParams = {
        name: householdName,
        member_count: memberCount,
        core_chores: coreChores,
        chore_frequency: choreFrequency || undefined,
        chore_framework: choreFramework.trim() || undefined,
      };
      const newHousehold = await createHousehold(params);
      if (newHousehold) {
        onHouseholdCreated(newHousehold.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create household.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCoreChoresChange = (selectedOptions: MultiValue<ChoreOptionType>) => {
    setCoreChores(selectedOptions ? selectedOptions.map(option => option.value) : []);
  };

  const selectedValueForReactSelect = reactSelectChoreOptions.filter(option =>
    coreChores.includes(option.value)
  );

  // A generic input style to match the design system
  const inputStyles = "mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm";

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Set Up Your Household</h2>
      {error && <p className="text-destructive text-sm mb-4 text-center">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="householdName" className="block text-sm font-medium text-foreground">
            Household Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            id="householdName"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            required
            className={inputStyles}
            placeholder="e.g., The Cozy Corner, Apartment 10B"
          />
        </div>

        <div>
          <label htmlFor="memberCount" className="block text-sm font-medium text-foreground">
            Target Number of Members <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            id="memberCount"
            value={memberCount}
            onChange={(e) => setMemberCount(parseInt(e.target.value, 10))}
            min="1"
            required
            className={inputStyles}
          />
        </div>
        
        <div>
          <label htmlFor="coreChores" className="block text-sm font-medium text-foreground">
            Core Chores (Optional)
          </label>
          <Select
            id="coreChores"
            isMulti
            options={reactSelectChoreOptions}
            value={selectedValueForReactSelect}
            onChange={handleCoreChoresChange}
            className="mt-1 block w-full basic-multi-select"
            classNamePrefix="select"
            placeholder="Select chores..."
            noOptionsMessage={() => "No more chores available"}
          />
        </div>

        <div>
          <label htmlFor="choreFrequency" className="block text-sm font-medium text-foreground">
            Frequency of Chores (Optional)
          </label>
          <select
            id="choreFrequency"
            value={choreFrequency}
            onChange={(e) => setChoreFrequency(e.target.value)}
            className={inputStyles}
          >
            <option value="Weekly">Weekly</option>
            <option value="Bi-weekly">Bi-weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="As needed">As needed</option>
          </select>
        </div>

        <div>
          <label htmlFor="choreFramework" className="block text-sm font-medium text-foreground">
            Framework for Chore Doing <span className="text-destructive">*</span>
          </label>
          <select
            id="choreFramework"
            value={choreFramework}
            onChange={(e) => setChoreFramework(e.target.value)}
            required
            className={inputStyles}
          >
            <option value="Split">Split</option>
            <option value="One person army">One person army</option>
          </select>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : 'Create Household'}
        </Button>
      </form>
    </div>
  );
};
// src/components/HouseholdSetupForm.tsx
// This component allows users to set up their household with a name, member count, core chores, chore frequency, and chore framework.
// It uses a form to collect the necessary information and calls the `createHousehold` API function to create the household.
// It also handles validation and displays any errors that occur during the creation process.
// src/components/HouseholdSetupForm.tsx