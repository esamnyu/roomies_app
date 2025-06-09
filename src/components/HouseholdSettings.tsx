// src/components/HouseholdSettings.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import * as api from '@/lib/api';
import type { Household, HouseholdMember, HouseRule } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Loader2, User, KeyRound, Trash2, Shield, LogOut, AlertTriangle, Plus, Edit3 } from 'lucide-react';

// ... (SettingsCard, AddRuleModal, and EditRuleModal components remain the same)
interface HouseholdSettingsProps {
  household: Household;
  members: HouseholdMember[];
  onUpdate: () => void;
}

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

const AddRuleModal: React.FC<{
  householdId: string;
  onClose: () => void;
  onRuleAdded: () => void;
}> = ({ householdId, onClose, onRuleAdded }) => {
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!category.trim() || !content.trim()) {
      toast.error("Both category and content are required.");
      return;
    }
    setIsSaving(true);
    try {
      await api.addHouseRule(householdId, category.trim(), content.trim());
      toast.success("New rule added!");
      onRuleAdded();
    } catch (error) {
      toast.error("Failed to add rule: " + (error instanceof Error ? error.message : ""));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add a New House Rule</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
            <input type="text" id="category" value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full input" placeholder="e.g., Cleanliness, Guests" />
          </div>
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">Rule Content</label>
            <textarea id="content" value={content} onChange={e => setContent(e.target.value)} className="mt-1 w-full input" rows={3} placeholder="Describe the rule..."></textarea>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} disabled={isSaving} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={isSaving || !category || !content} className="btn-primary">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Rule'}
          </button>
        </div>
      </div>
    </div>
  );
};

const EditRuleModal: React.FC<{
  householdId: string;
  rule: HouseRule;
  onClose: () => void;
  onRuleUpdated: () => void;
}> = ({ householdId, rule, onClose, onRuleUpdated }) => {
  const [category, setCategory] = useState(rule.category);
  const [content, setContent] = useState(rule.content);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!category.trim() || !content.trim()) {
      toast.error("Both category and content are required.");
      return;
    }
    setIsSaving(true);
    try {
      await api.updateHouseRule(householdId, { ...rule, category, content });
      toast.success("Rule updated!");
      onRuleUpdated();
    } catch (error) {
      toast.error("Failed to update rule: " + (error instanceof Error ? error.message : ""));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Edit House Rule</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700">Category</label>
            <input type="text" id="edit-category" value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full input" />
          </div>
          <div>
            <label htmlFor="edit-content" className="block text-sm font-medium text-gray-700">Rule Content</label>
            <textarea id="edit-content" value={content} onChange={e => setContent(e.target.value)} className="mt-1 w-full input" rows={3}></textarea>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} disabled={isSaving} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={isSaving || !category || !content} className="btn-primary">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};


// MODIFIED: RuleCard now takes onDelete as a prop
const RuleCard: React.FC<{ 
  rule: HouseRule; 
  isAdmin: boolean; 
  onEdit: (rule: HouseRule) => void;
  onDelete: (ruleId: string) => void;
}> = ({ rule, isAdmin, onEdit, onDelete }) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border">
      <div className="flex justify-between items-center">
        <h4 className="text-md font-semibold text-gray-700">{rule.category}</h4>
        {isAdmin && (
          <div className="flex space-x-2">
            <button onClick={() => onEdit(rule)} className="text-gray-400 hover:text-blue-600" title="Edit Rule">
              <Edit3 className="h-4 w-4" />
            </button>
            <button onClick={() => onDelete(rule.id)} className="text-gray-400 hover:text-red-600" title="Delete Rule">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{rule.content}</p>
    </div>
  );
};


export const HouseholdSettings: React.FC<HouseholdSettingsProps> = ({ household, members, onUpdate }) => {
  const { user } = useAuth();

  const [name, setName] = useState(household.name);
  const [memberCount, setMemberCount] = useState(household.member_count || 1);
  const [choreFramework, setChoreFramework] = useState(household.chore_framework || 'Split');
  const [choreFrequency, setChoreFrequency] = useState(household.chore_frequency || 'Weekly');
  
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [showEditRuleModal, setShowEditRuleModal] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<HouseRule | null>(null);


  useEffect(() => {
    setName(household.name);
    setMemberCount(household.member_count || 1);
    setChoreFramework(household.chore_framework || 'Split');
    setChoreFrequency(household.chore_frequency || 'Weekly');
  }, [household]);

  const handleUpdateHouseholdDetails = async () => {
    // ... (this function is unchanged)
    setIsSavingDetails(true);
    try {
      await api.updateHouseholdSettings(household.id, {
        name,
        member_count: memberCount,
        chore_framework: choreFramework,
        chore_frequency: choreFrequency,
      });
      toast.success("Household details updated!");
      onUpdate();
    } catch (error) {
      toast.error("Failed to update details: " + (error instanceof Error ? error.message : ""));
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleRuleAdded = () => {
    setShowAddRuleModal(false);
    onUpdate(); 
  };
  
  const handleOpenEditModal = (rule: HouseRule) => {
    setRuleToEdit(rule);
    setShowEditRuleModal(true);
  };

  const handleRuleUpdated = () => {
    setShowEditRuleModal(false);
    setRuleToEdit(null);
    onUpdate();
  };

  // NEW: Handler for deleting a rule
  const handleDeleteRule = async (ruleId: string) => {
    if (window.confirm("Are you sure you want to delete this rule permanently?")) {
      try {
        await api.deleteHouseRule(household.id, ruleId);
        toast.success("Rule deleted.");
        onUpdate();
      } catch (error) {
        toast.error("Failed to delete rule: " + (error instanceof Error ? error.message : ""));
      }
    }
  };

  // ... (handleRemoveMember, etc. are unchanged)
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
  const isAdmin = currentUserRole === 'admin';

  return (
    <>
      <div className="space-y-8">
        {/* ... (Other SettingsCards are unchanged) ... */}
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
          <input type="text" id="householdName" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full input" disabled={!isAdmin} />
        </div>
        <div>
          <label htmlFor="memberCount" className="block text-sm font-medium text-gray-700">Target Member Count</label>
          <input type="number" id="memberCount" min="1" value={memberCount} onChange={e => setMemberCount(parseInt(e.target.value, 10))} className="mt-1 w-full input" disabled={!isAdmin} />
        </div>
      </SettingsCard>

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
             <select id="choreFramework" value={choreFramework} onChange={e => setChoreFramework(e.target.value as 'Split' | 'One person army')} className="mt-1 w-full input" disabled={!isAdmin}>
                <option value="Split">Split - Chores are divided among members each cycle.</option>
                <option value="One person army">One Person Army - One member does all chores for a cycle.</option>
            </select>
        </div>
        <div>
            <label htmlFor="choreFrequency" className="block text-sm font-medium text-gray-700">Chore Frequency</label>
             <select id="choreFrequency" value={choreFrequency} onChange={e => setChoreFrequency(e.target.value as 'Daily' | 'Weekly' | 'Bi-weekly' | 'Monthly')} className="mt-1 w-full input" disabled={!isAdmin}>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Bi-weekly">Bi-weekly</option>
                <option value="Monthly">Monthly</option>
            </select>
        </div>
        <p className="text-xs text-gray-500">To add, edit, or remove specific chores, please visit the main "Chores" tab.</p>
      </SettingsCard>

        <SettingsCard 
          title="House Rules"
          footer={
            isAdmin && (
              <button 
                onClick={() => setShowAddRuleModal(true)} 
                className="btn-primary flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Rule
              </button>
            )
          }
        >
          <div className="space-y-4">
            {household.rules && household.rules.length > 0 ? (
              household.rules.map((rule) => (
                <RuleCard 
                    key={rule.id} 
                    rule={rule} 
                    isAdmin={isAdmin} 
                    onEdit={handleOpenEditModal} 
                    // MODIFIED: Pass the delete handler to the card
                    onDelete={handleDeleteRule}
                />
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No house rules have been added yet.</p>
                {isAdmin && <p className="text-xs text-gray-400 mt-1">Click "Add New Rule" to get started.</p>}
              </div>
            )}
          </div>
        </SettingsCard>
        
        <SettingsCard title="Member Management">
        <div className="divide-y divide-gray-200">
            {members.map(member => (
                <div key={member.id} className="py-3 flex justify-between items-center">
                    <div>
                        <p className="font-medium">{member.profiles?.name} {member.user_id === user?.id && '(You)'}</p>
                        <p className="text-sm text-gray-500 capitalize">{member.role}</p>
                    </div>
                    {isAdmin && user?.id !== member.user_id && (
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

      {showAddRuleModal && (
        <AddRuleModal 
          householdId={household.id}
          onClose={() => setShowAddRuleModal(false)}
          onRuleAdded={handleRuleAdded}
        />
      )}

      {showEditRuleModal && ruleToEdit && (
        <EditRuleModal
          householdId={household.id}
          rule={ruleToEdit}
          onClose={() => setShowEditRuleModal(false)}
          onRuleUpdated={handleRuleUpdated}
        />
      )}
    </>
  );
};