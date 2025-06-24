"use client";

import React, { useState, useEffect } from 'react';
import { updateUserProfile } from '../lib/api';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import type { Profile } from '../lib/types/types';

// 1. UPDATE THE PROPS INTERFACE
// It now accepts `isOpen` to control visibility and `profile` directly,
// instead of fetching the data itself.
interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: Profile;
    onUpdate?: () => void; // Optional: A function to refresh data in the parent
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, profile, onUpdate }) => {
    // 2. SIMPLIFY STATE
    // The component no longer needs its own 'profile' or internal 'loading' state.
    const [vacationStart, setVacationStart] = useState('');
    const [vacationEnd, setVacationEnd] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // 3. POPULATE FORM FROM PROPS
    // This effect runs when the 'profile' prop changes, setting the initial form values.
    useEffect(() => {
        if (profile) {
            setVacationStart(profile.vacation_start_date?.split('T')[0] || '');
            setVacationEnd(profile.vacation_end_date?.split('T')[0] || '');
        }
    }, [profile]);
    
    const handleSave = async () => {
        if (vacationStart && vacationEnd && new Date(vacationStart) > new Date(vacationEnd)) {
            toast.error("Vacation start date cannot be after the end date.");
            return;
        }

        setIsSaving(true);
        try {
            await updateUserProfile(profile.id, {
                vacation_start_date: vacationStart || null,
                vacation_end_date: vacationEnd || null,
            });
            toast.success("Profile updated successfully!");
            
            if (onUpdate) {
                onUpdate();
            }
            onClose(); // Close the modal on successful save
        } catch (error) {
            toast.error("Failed to update profile.");
        } finally {
            setIsSaving(false);
        }
    };

    // 4. CONTROL VISIBILITY
    // If the modal isn't 'isOpen', render nothing.
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-lg rounded-lg bg-background p-6">
                <h2 className="mb-4 text-xl font-semibold text-foreground">My Profile</h2>
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium">My Vacation Mode</h3>
                        <p className="mt-1 text-sm text-secondary-foreground">
                            You will not be assigned chores during your vacation.
                        </p>
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label htmlFor="vacation-start" className="block text-sm font-medium">Start Date</label>
                                <Input id="vacation-start" type="date" value={vacationStart} onChange={e => setVacationStart(e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor="vacation-end" className="block text-sm font-medium">End Date</label>
                                <Input id="vacation-end" type="date" value={vacationEnd} onChange={e => setVacationEnd(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-8 flex justify-end space-x-3">
                    <Button onClick={onClose} variant="secondary" disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </div>
    );
};