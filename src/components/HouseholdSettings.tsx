// src/components/HouseholdSettings.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import * as api from '@/lib/api';
import type { Household, HouseholdMember, HouseRule } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Loader2, User, KeyRound, Trash2, Shield, LogOut, AlertTriangle, Plus, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface HouseholdSettingsProps {
  household: Household;
  members: HouseholdMember[];
  onUpdate: () => void;
}

const SettingsCard: React.FC<{ title: string; children: React.ReactNode; footer?: React.ReactNode }> = ({ title, children, footer }) => (
  <div className="bg-background rounded-lg shadow border border-border">
    <div className="p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
    {footer && (
      <div className="bg-secondary px-6 py-3 rounded-b-lg text-right">
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

  const inputStyles = "mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-foreground mb-4">Add a New House Rule</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-foreground">Category</label>
            <input type="text" id="category" value={category} onChange={e => setCategory(e.target.value)} className={inputStyles} placeholder="e.g., Cleanliness, Guests" />
          </div>
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-foreground">Rule Content</label>
            <textarea id="content" value={content} onChange={e => setContent(e.target.value)} className={inputStyles} rows={3} placeholder="Describe the rule..."></textarea>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <Button onClick={onClose} disabled={isSaving} variant="secondary">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !category || !content}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Rule'}
          </Button>
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

  const inputStyles = "mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-foreground mb-4">Edit House Rule</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-category" className="block text-sm font-medium text-foreground">Category</label>
            <input type="text" id="edit-category" value={category} onChange={e => setCategory(e.target.value)} className={inputStyles} />
          </div>
          <div>
            <label htmlFor="edit-content" className="block text-sm font-medium text-foreground">Rule Content</label>
            <textarea id="edit-content" value={content} onChange={e => setContent(e.target.value)} className={inputStyles} rows={3}></textarea>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <Button onClick={onClose} disabled={isSaving} variant="secondary">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !category || !content}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const RuleCard: React.FC<{ 
  rule: HouseRule; 
  isAdmin: boolean; 
  onEdit: (rule: HouseRule) => void;
  onDelete: (ruleId: string) => void;
}> = ({ rule, isAdmin, onEdit, onDelete }) => {
  return (
    <div className="bg-secondary p-4 rounded-lg border border-border">
      <div className="flex justify-between items-center">
        <h4 className="text-md font-semibold text-foreground">{rule.category}</h4>
        {isAdmin && (
          <div className="flex space-x-2">
            <button onClick={() => onEdit(rule)} className="text-secondary-foreground hover:text-primary" title="Edit Rule">
              <Edit3 className="h-4 w-4" />
            </button>
            <button onClick={() => onDelete(rule.id)} className="text-secondary-foreground hover:text-destructive" title="Delete Rule">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <p className="mt-2 text-sm text-secondary-foreground whitespace-pre-wrap">{rule.content}</p>
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
  const inputStyles = "mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm disabled:opacity-50 disabled:bg-secondary";

  return (
    <>
      <div className="space-y-8">
        <SettingsCard 
          title="Household Details"
          footer={ isAdmin &&
            <Button onClick={handleUpdateHouseholdDetails} disabled={isSavingDetails}>
              {isSavingDetails ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Save Changes'}
            </Button>
          }
        >
          <div>
            <label htmlFor="householdName" className="block text-sm font-medium text-foreground">Household Name</label>
            <input type="text" id="householdName" value={name} onChange={e => setName(e.target.value)} className={inputStyles} disabled={!isAdmin} />
          </div>
          <div>
            <label htmlFor="memberCount" className="block text-sm font-medium text-foreground">Target Member Count</label>
            <input type="number" id="memberCount" min="1" value={memberCount} onChange={e => setMemberCount(parseInt(e.target.value, 10))} className={inputStyles} disabled={!isAdmin} />
          </div>
        </SettingsCard>

        <SettingsCard 
          title="Chore Configuration"
          footer={ isAdmin &&
            <Button onClick={handleUpdateHouseholdDetails} disabled={isSavingDetails}>
              {isSavingDetails ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Save Chore Settings'}
            </Button>
          }
        >
          <div>
              <label htmlFor="choreFramework" className="block text-sm font-medium text-foreground">Chore Framework</label>
              <select id="choreFramework" value={choreFramework} onChange={e => setChoreFramework(e.target.value as 'Split' | 'One person army')} className={inputStyles} disabled={!isAdmin}>
                  <option value="Split">Split - Chores are divided among members each cycle.</option>
                  <option value="One person army">One Person Army - One member does all chores for a cycle.</option>
              </select>
          </div>
          <div>
              <label htmlFor="choreFrequency" className="block text-sm font-medium text-foreground">Chore Frequency</label>
              <select id="choreFrequency" value={choreFrequency} onChange={e => setChoreFrequency(e.target.value as 'Daily' | 'Weekly' | 'Bi-weekly' | 'Monthly')} className={inputStyles} disabled={!isAdmin}>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Bi-weekly">Bi-weekly</option>
                  <option value="Monthly">Monthly</option>
              </select>
          </div>
          <p className="text-xs text-secondary-foreground opacity-70">To add, edit, or remove specific chores, please visit the main "Chores" tab.</p>
        </SettingsCard>

        <SettingsCard 
          title="House Rules"
          footer={
            isAdmin && (
              <Button onClick={() => setShowAddRuleModal(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add New Rule
              </Button>
            )
          }
        >
          <div className="space-y-4">
            {household.rules && household.rules.length > 0 ? (
              household.rules.map((rule) => (
                <RuleCard key={rule.id} rule={rule} isAdmin={isAdmin} onEdit={handleOpenEditModal} onDelete={handleDeleteRule}/>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-secondary-foreground">No house rules have been added yet.</p>
                {isAdmin && <p className="text-xs text-secondary-foreground opacity-70 mt-1">Click "Add New Rule" to get started.</p>}
              </div>
            )}
          </div>
        </SettingsCard>
        
        <SettingsCard title="Member Management">
          <div className="divide-y divide-border">
              {members.map(member => (
                  <div key={member.id} className="py-3 flex justify-between items-center">
                      <div>
                          <p className="font-medium text-foreground">{member.profiles?.name} {member.user_id === user?.id && '(You)'}</p>
                          <p className="text-sm text-secondary-foreground capitalize">{member.role}</p>
                      </div>
                      {isAdmin && user?.id !== member.user_id && (
                          <div className="flex space-x-2">
                            {member.role !== 'admin' && (
                              <Button onClick={() => handlePromoteMember(member)} variant="secondary" size="sm" title="Promote to Admin">
                                  <Shield className="h-4 w-4"/>
                              </Button>
                            )}
                              <Button onClick={() => handleRemoveMember(member)} variant="destructive" size="sm" title="Remove Member">
                                  <Trash2 className="h-4 w-4"/>
                              </Button>
                          </div>
                      )}
                  </div>
              ))}
          </div>
        </SettingsCard>

        <SettingsCard title="Danger Zone">
            <div className="space-y-4">
                <div>
                    <Button onClick={handleLeaveHousehold} variant="destructive" className="w-full sm:w-auto">
                        <LogOut className="h-4 w-4 mr-2" /> Leave Household
                    </Button>
                    <p className="text-xs text-secondary-foreground opacity-70 mt-1">You will be removed from the household. This cannot be undone.</p>
                </div>
                {household.created_by === user?.id && (
                      <div>
                        <Button onClick={handleDeleteHousehold} variant="destructive" className="w-full sm:w-auto">
                            <AlertTriangle className="h-4 w-4 mr-2" /> Delete Household
                        </Button>
                        <p className="text-xs text-secondary-foreground opacity-70 mt-1">This will permanently delete the household and all its data. This action is irreversible.</p>
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