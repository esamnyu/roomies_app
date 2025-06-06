// src/components/HouseholdSetupForm.tsx
'use client';

import React, { useState } from 'react';
import Select, { MultiValue } from 'react-select'; // <--- IMPORT react-select
import { useAuth } from './AuthProvider';
import * as api from '@/lib/api';
// useRouter is imported but not used in the provided snippet, remove if not needed elsewhere.
// import { useRouter } from 'next/navigation';

interface HouseholdSetupFormProps {
  onHouseholdCreated: (householdId: string) => void;
}

// Define the shape of options for react-select
interface ChoreOptionType {
  value: string;
  label: string;
}

export const HouseholdSetupForm: React.FC<HouseholdSetupFormProps> = ({ onHouseholdCreated }) => {
  const { user } = useAuth();
  // const router = useRouter(); // Not used in this component currently
  const [householdName, setHouseholdName] = useState('');
  const [memberCount, setMemberCount] = useState(2);
  const [coreChores, setCoreChores] = useState<string[]>([]); // State remains string[]
  const [choreFrequency, setChoreFrequency] = useState('Weekly');
  const [choreFramework, setChoreFramework] = useState('Split');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const AVAILABLE_CORE_CHORES_LIST = [ // Renamed for clarity
    "Kitchen cleaning",
    "Living room cleaning",
    "Taking out trash",
    "Bathroom cleaning"
  ];

  // Format options for react-select
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
    // Add validation for coreChores if it becomes mandatory
    // if (coreChores.length === 0) {
    //   setError('Please select at least one core chore.');
    //   return;
    // }

    setIsLoading(true);
    setError(null);

    try {
      const params: api.CreateHouseholdParams = {
        name: householdName,
        member_count: memberCount,
        core_chores: coreChores,
        chore_frequency: choreFrequency || undefined,
        chore_framework: choreFramework.trim() || undefined,
      };
      const newHousehold = await api.createHousehold(params);
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

  // Handler for react-select's onChange
  const handleCoreChoresChange = (selectedOptions: MultiValue<ChoreOptionType>) => {
    setCoreChores(selectedOptions ? selectedOptions.map(option => option.value) : []);
  };

  // Determine the value for react-select based on the current coreChores state
  const selectedValueForReactSelect = reactSelectChoreOptions.filter(option =>
    coreChores.includes(option.value)
  );

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

        {/* --- MODIFIED Core Chores Field --- */}
        <div>
          <label htmlFor="coreChores" className="block text-sm font-medium text-gray-700">
            Core Chores (Optional)
          </label>
          <Select
            id="coreChores"
            isMulti
            options={reactSelectChoreOptions}
            value={selectedValueForReactSelect}
            onChange={handleCoreChoresChange}
            className="mt-1 block w-full basic-multi-select"
            classNamePrefix="select" // Important for styling with react-select's default styles or custom styles
            placeholder="Select chores..."
            noOptionsMessage={() => "No more chores available"}
          />
          {/* The helper text for Ctrl+click is no longer needed with react-select */}
        </div>
        {/* --- END MODIFIED Core Chores Field --- */}

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
            Framework for Chore Doing <span className="text-red-500">*</span>
          </label>
          <select
            id="choreFramework"
            value={choreFramework}
            onChange={(e) => setChoreFramework(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="Split">Split</option>
            <option value="One person army">One person army</option>
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