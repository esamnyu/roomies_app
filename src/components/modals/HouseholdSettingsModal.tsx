// src/components/HouseholdSettingsModal.tsx
"use client";

import React, { useState } from 'react';
import { useAuth } from '../AuthProvider';
import { 
  updateHouseholdSettings, 
  removeMember, 
  updateMemberRole, 
  leaveHousehold, 
  deleteHousehold 
} from '../../lib/api/households';
import type { Household, HouseholdMember } from '../../lib/types/types';
import { toast } from 'react-hot-toast';
import { Loader2, Trash2, Shield, LogOut, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface HouseholdSettingsModalProps {
    household: Household;
    members: HouseholdMember[];
    onClose: () => void;
    onUpdate: () => void;
}

const SettingsCard: React.FC<{ title: string; children: React.ReactNode; footer?: React.ReactNode; className?: string }> = ({ title, children, footer, className }) => (
  <div className={`bg-secondary/50 rounded-lg shadow-inner ${className}`}>
    <div className="p-4">
      <h3 className="text-md font-semibold text-foreground mb-3">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
    {footer && <div className="bg-secondary/30 px-4 py-3 rounded-b-lg text-right">{footer}</div>}
  </div>
);

export const HouseholdSettingsModal: React.FC<HouseholdSettingsModalProps> = ({ household, members, onClose, onUpdate }) => {
    const { user, signOut } = useAuth();
    const [name, setName] = useState(household.name);
    const [memberCount, setMemberCount] = useState(household.member_count || 1);
    const [choreFramework, setChoreFramework] = useState(household.chore_framework || 'Split');
    const [choreFrequency, setChoreFrequency] = useState(household.chore_frequency || 'Weekly');
    const [deleteConfirmName, setDeleteConfirmName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const currentUserRole = members.find(m => m.user_id === user?.id)?.role;
    const isAdmin = currentUserRole === 'admin';

    const handleUpdate = async () => {
        setIsSaving(true);
        try {
            await updateHouseholdSettings(household.id, { name, member_count: memberCount, chore_framework: choreFramework, chore_frequency: choreFrequency });
            toast.success("Household settings updated!");
            onUpdate();
        } catch (error) {
            toast.error("Failed to update settings.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleRemoveMember = async (memberToRemove: HouseholdMember) => {
        if (window.confirm(`Are you sure you want to remove ${memberToRemove.profiles?.name} from the household?`)) {
            try {
                await removeMember(memberToRemove.id);
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
                await updateMemberRole(memberToPromote.id, 'admin');
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
                await leaveHousehold(household.id);
                toast.success("You have left the household.");
                onClose();
                window.location.reload(); 
            } catch(error) {
                toast.error("Failed to leave household: " + (error instanceof Error ? error.message : ""));
            }
        }
    }

    const handleDeleteHousehold = async () => {
        if (deleteConfirmName !== household.name) {
            toast.error("The entered name does not match the household name.");
            return;
        }
        try {
            await deleteHousehold(household.id);
            toast.success(`Household '${household.name}' has been deleted.`);
             onClose();
            window.location.reload();
        } catch(error) {
             toast.error("Failed to delete household: " + (error instanceof Error ? error.message : ""));
        }
    }
    
    const selectStyles = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg max-w-2xl w-full my-8 flex flex-col">
                <div className="p-6 border-b border-border">
                    <h2 className="text-xl font-semibold text-foreground">Household Settings</h2>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto" style={{maxHeight: '75vh'}}>
                    <SettingsCard title="Household Details">
                        <div>
                            <label htmlFor="h-name" className="text-sm font-medium">Name</label>
                            <Input id="h-name" value={name} onChange={e => setName(e.target.value)} disabled={!isAdmin} />
                        </div>
                         <div>
                            <label htmlFor="h-members" className="text-sm font-medium">Member Capacity</label>
                            <Input id="h-members" type="number" min="1" value={memberCount} onChange={e => setMemberCount(parseInt(e.target.value) || 1)} disabled={!isAdmin} />
                        </div>
                    </SettingsCard>
                    <SettingsCard title="Chore Configuration">
                         <div>
                            <label htmlFor="h-framework" className="text-sm font-medium">Framework</label>
                            <select id="h-framework" className={selectStyles} value={choreFramework} onChange={e => setChoreFramework(e.target.value as any)} disabled={!isAdmin}>
                                <option value="Split">Split</option>
                                <option value="One person army">One Person Army</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="h-frequency" className="text-sm font-medium">Frequency</label>
                            <select id="h-frequency" className={selectStyles} value={choreFrequency} onChange={e => setChoreFrequency(e.target.value as any)} disabled={!isAdmin}>
                                <option value="Daily">Daily</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Bi-weekly">Bi-weekly</option>
                                <option value="Monthly">Monthly</option>
                            </select>
                        </div>
                    </SettingsCard>

                    <SettingsCard title="Member Management">
                        <div className="divide-y divide-border -m-4">
                            {members.map(member => (
                                <div key={member.id} className="py-3 px-4 flex justify-between items-center">
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

                    <SettingsCard title="Danger Zone" className="border-destructive/50 ring-1 ring-destructive/20">
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-foreground">Leave Household</h4>
                                <p className="text-xs text-secondary-foreground opacity-70 mt-1">You will be removed from the household. This action cannot be undone.</p>
                                <Button onClick={handleLeaveHousehold} variant="destructive" className="mt-2 w-full sm:w-auto">
                                    <LogOut className="h-4 w-4 mr-2" /> Leave Household
                                </Button>
                            </div>
                            {household.created_by === user?.id && (
                                <div className="pt-4 border-t border-border">
                                    <h4 className="font-medium text-foreground">Delete Household</h4>
                                    <p className="text-xs text-secondary-foreground opacity-70 mt-1">This will permanently delete the household and all associated data. This action is irreversible.</p>
                                    <div className="mt-2">
                                        <label htmlFor="deleteConfirm" className="block text-sm font-medium text-foreground">
                                            Type <span className="font-bold text-destructive">{household.name}</span> to confirm:
                                        </label>
                                        <Input
                                            type="text"
                                            id="deleteConfirm"
                                            value={deleteConfirmName}
                                            onChange={(e) => setDeleteConfirmName(e.target.value)}
                                            className="mt-1"
                                            placeholder="Household name"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleDeleteHousehold}
                                        variant="destructive"
                                        className="mt-2 w-full sm:w-auto"
                                        disabled={deleteConfirmName !== household.name}
                                    >
                                        <AlertTriangle className="h-4 w-4 mr-2" /> Delete This Household
                                    </Button>
                                </div>
                            )}
                        </div>
                    </SettingsCard>
                </div>
                <div className="p-4 border-t border-border flex justify-end space-x-3 bg-secondary/20">
                    <Button onClick={onClose} variant="secondary" disabled={isSaving}>Close</Button>
                    {isAdmin && <Button onClick={handleUpdate} disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" /> : 'Save All Changes'}</Button>}
                </div>
            </div>
        </div>
    );
};