// src/components/ProfileModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { getProfile, updateUserProfile } from '../lib/api';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Profile } from '../lib/types/types';

interface ProfileModalProps {
    user: SupabaseUser;
    onClose: () => void;
    onUpdate: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onUpdate }) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [vacationStart, setVacationStart] = useState('');
    const [vacationEnd, setVacationEnd] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const userProfile = await getProfile(user.id);
                if (userProfile) {
                    setProfile(userProfile);
                    setVacationStart(userProfile.vacation_start_date?.split('T')[0] || '');
                    setVacationEnd(userProfile.vacation_end_date?.split('T')[0] || '');
                }
            } catch (error) {
                toast.error("Could not load your profile.");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user.id]);
    
    const handleSave = async () => {
        if (!profile) return;
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
            onUpdate();
            onClose();
        } catch (error) {
            toast.error("Failed to update profile.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg p-6 max-w-lg w-full">
                <h2 className="text-xl font-semibold mb-4 text-foreground">My Profile</h2>
                {loading ? <Loader2 className="animate-spin" /> : (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium">My Vacation Mode</h3>
                        <p className="text-sm text-secondary-foreground mt-1">
                            You will not be assigned chores during your vacation.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                )}
                <div className="mt-8 flex justify-end space-x-3">
                    <Button onClick={onClose} variant="secondary" disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || loading}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </div>
    );
};