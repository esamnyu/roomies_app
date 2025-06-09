// src/components/HouseholdSettings.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import * as api from '@/lib/api';
import type { Household, HouseholdMember } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Loader2, User, KeyRound, Trash2, Shield, LogOut, AlertTriangle } from 'lucide-react';

interface HouseholdSettingsProps {
  household: Household;
  members: HouseholdMember[];
  onUpdate: () => void; // Function to refresh data in the parent component
}

// A reusable card component for consistent styling
const SettingsCard: React.FC<{ title: string; children: React.ReactNode; footer?: React.ReactNode }> = ({ title, children, footer }) => (
  <div className="bg-white rounded-lg shadow">
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
    {footer && (
      <div className="bg-gray-50 px-6 py-3 rounded-b-lg text-right">
        {footer}
      </div>
    )}
  </div>
);


export const HouseholdSettings: React.FC<HouseholdSettingsProps> = ({ household, members, onUpdate }) => {
  const { user } = useAuth();

  // State for forms
  const [name, setName] = useState(household.name);
  const [memberCount, setMemberCount] = useState(household.member_count || 1);
  const [choreFramework, setChoreFramework] = useState(household.chore_framework || 'Split');
  const [choreFrequency, setChoreFrequency] = useState(household.chore_frequency || 'Weekly');
  const [rules, setRules] = useState(household.rules_document || '');

  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isSavingRules, setIsSavingRules] = useState(false);

  // Reset form state if the household prop changes
  useEffect(() => {
    setName(household.name);
    setMemberCount(household.member_count || 1);
    setChoreFramework(household.chore_framework || 'Split');
    setChoreFrequency(household.chore_frequency || 'Weekly');
    setRules(household.rules_document || '');
  }, [household]);

  const handleUpdateHouseholdDetails = async () => {
    setIsSavingDetails(true);
    try {
      await api.updateHouseholdSettings(household.id, {
        name,
        member_count: memberCount,
        chore_framework: choreFramework,
        chore_frequency: choreFrequency,
      });
      toast.success("Household details updated!");
      onUpdate(); // Refresh parent component's data
    } catch (error) {
      toast.error("Failed to update details: " + (error instanceof Error ? error.message : ""));
    } finally {
      setIsSavingDetails(false);
    }
  };
  
  const handleUpdateRules = async () => {
    setIsSavingRules(true);
    try {
        await api.updateHouseRules(household.id, rules);
        toast.success("House rules saved!");
        onUpdate();
    } catch (error) {
        toast.error("Failed to save rules: " + (error instanceof Error ? error.message : ""));
    } finally {
        setIsSavingRules(false);
    }
  };

  const handleRemoveMember = async (memberToRemove: HouseholdMember) => {
    if (window.confirm(`Are you sure you want to remove ${memberToRemove.profiles?.name} from the household?`)) {
        try {
            await api.removeMember(memberToRemove.id);
            toast.success(`${memberToRemove.profiles?.name} has been removed.`);
            onUpdate();
        } catch (error) {
            toast.error("Failed to remove member: " + (error instanceof Error ? error.message : ""));
        }
    }
  };

  const handlePromoteMember = async (memberToPromote: HouseholdMember) => {
    if (window.confirm(`Are you sure you want to make ${memberToPromote.profiles?.name} an admin?`)) {
        try {
            await api.updateMemberRole(memberToPromote.id, 'admin');
            toast.success(`${memberToPromote.profiles?.name} is now an admin.`);
            onUpdate();
        } catch (error) {
            toast.error("Failed to promote member: " + (error instanceof Error ? error.message : ""));
        }
    }
  }
  
  const handleLeaveHousehold = async () => {
    if (window.confirm("Are you sure you want to leave this household? This action cannot be undone.")) {
        try {
            await api.leaveHousehold(household.id);
            toast.success("You have left the household.");
            // This should ideally redirect the user or refresh the entire app state
            window.location.reload(); 
        } catch(error) {
            toast.error("Failed to leave household: " + (error instanceof Error ? error.message : ""));
        }
    }
  }

  const handleDeleteHousehold = async () => {
     if (window.confirm(`DANGER: Are you sure you want to permanently delete "${household.name}"? All data will be lost.`)) {
        try {
            await api.deleteHousehold(household.id);
            toast.success(`Household "${household.name}" has been deleted.`);
            window.location.reload();
        } catch(error) {
             toast.error("Failed to delete household: " + (error instanceof Error ? error.message : ""));
        }
     }
  }

  const currentUserRole = members.find(m => m.user_id === user?.id)?.role;

  return (
    <div className="space-y-8">
      {/* Household Details */}
      <SettingsCard 
        title="Household Details"
        footer={
          <button onClick={handleUpdateHouseholdDetails} disabled={isSavingDetails} className="btn-primary">
            {isSavingDetails ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Save Changes'}
          </button>
        }
      >
        <div>
          <label htmlFor="householdName" className="block text-sm font-medium text-gray-700">Household Name</label>
          <input type="text" id="householdName" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full input" disabled={currentUserRole !== 'admin'} />
        </div>
        <div>
          <label htmlFor="memberCount" className="block text-sm font-medium text-gray-700">Target Member Count</label>
          <input type="number" id="memberCount" min="1" value={memberCount} onChange={e => setMemberCount(parseInt(e.target.value, 10))} className="mt-1 w-full input" disabled={currentUserRole !== 'admin'} />
        </div>
      </SettingsCard>

       {/* Chore Configuration */}
       <SettingsCard 
        title="Chore Configuration"
        footer={
          <button onClick={handleUpdateHouseholdDetails} disabled={isSavingDetails} className="btn-primary">
            {isSavingDetails ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Save Chore Settings'}
          </button>
        }
      >
        <div>
            <label htmlFor="choreFramework" className="block text-sm font-medium text-gray-700">Chore Framework</label>
             <select id="choreFramework" value={choreFramework} onChange={e => setChoreFramework(e.target.value as 'Split' | 'One person army')} className="mt-1 w-full input" disabled={currentUserRole !== 'admin'}>
                <option value="Split">Split - Chores are divided among members each cycle.</option>
                <option value="One person army">One Person Army - One member does all chores for a cycle.</option>
            </select>
        </div>
        <div>
            <label htmlFor="choreFrequency" className="block text-sm font-medium text-gray-700">Chore Frequency</label>
             <select id="choreFrequency" value={choreFrequency} onChange={e => setChoreFrequency(e.target.value as 'Daily' | 'Weekly' | 'Bi-weekly' | 'Monthly')} className="mt-1 w-full input" disabled={currentUserRole !== 'admin'}>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Bi-weekly">Bi-weekly</option>
                <option value="Monthly">Monthly</option>
            </select>
        </div>
        <p className="text-xs text-gray-500">To add, edit, or remove specific chores, please visit the main "Chores" tab.</p>
      </SettingsCard>

      {/* House Rules */}
      <SettingsCard 
        title="House Rules"
        footer={
          <button onClick={handleUpdateRules} disabled={isSavingRules} className="btn-primary">
            {isSavingRules ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Save Rules'}
          </button>
        }
      >
        <p className="text-sm text-gray-500">
            Establish clear guidelines for everyone. Only admins can edit.
            {household.rules_last_updated && ` Last updated: ${new Date(household.rules_last_updated).toLocaleDateString()}`}
        </p>
        <textarea 
            value={rules}
            onChange={e => setRules(e.target.value)}
            className="mt-1 w-full input min-h-[200px]"
            placeholder="e.g.&#10;- Quiet hours after 11 PM on weeknights.&#10;- Clean your own dishes immediately.&#10;- Guests are welcome, but please give a heads-up."
            disabled={currentUserRole !== 'admin'}
        />
      </SettingsCard>

      {/* Member Management */}
      <SettingsCard title="Member Management">
        <div className="divide-y divide-gray-200">
            {members.map(member => (
                <div key={member.id} className="py-3 flex justify-between items-center">
                    <div>
                        <p className="font-medium">{member.profiles?.name} {member.user_id === user?.id && '(You)'}</p>
                        <p className="text-sm text-gray-500 capitalize">{member.role}</p>
                    </div>
                    {currentUserRole === 'admin' && user?.id !== member.user_id && (
                        <div className="flex space-x-2">
                           {member.role !== 'admin' && (
                             <button onClick={() => handlePromoteMember(member)} className="btn-secondary-sm" title="Promote to Admin">
                                <Shield className="h-4 w-4"/>
                             </button>
                           )}
                            <button onClick={() => handleRemoveMember(member)} className="btn-danger-sm" title="Remove Member">
                                <Trash2 className="h-4 w-4"/>
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
      </SettingsCard>

      {/* Danger Zone */}
       <SettingsCard title="Danger Zone">
           <div className="space-y-4">
               <div>
                   <button onClick={handleLeaveHousehold} className="btn-danger w-full sm:w-auto">
                       <LogOut className="h-4 w-4 mr-2" />
                       Leave Household
                   </button>
                   <p className="text-xs text-gray-500 mt-1">You will be removed from the household. This cannot be undone.</p>
               </div>

                {household.created_by === user?.id && (
                     <div>
                        <button onClick={handleDeleteHousehold} className="btn-danger w-full sm:w-auto">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Delete Household
                        </button>
                        <p className="text-xs text-gray-500 mt-1">This will permanently delete the household and all its data for everyone. This action is irreversible.</p>
                    </div>
                )}
           </div>
       </SettingsCard>
    </div>
  );
};