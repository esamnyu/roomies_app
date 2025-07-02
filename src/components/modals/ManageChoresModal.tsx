// src/components/modals/ManageChoresModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { X, Loader2, Edit2, Trash2, ToggleLeft, ToggleRight, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { 
    getHouseholdChores, 
    updateHouseholdChore, 
    deleteHouseholdChore, 
    toggleChoreActive 
} from '@/lib/api/chores';
import { toast } from 'react-hot-toast';
import type { HouseholdChore } from '@/lib/types/types';

interface ManageChoresModalProps {
    householdId: string;
    onClose: () => void;
    onChoresUpdated: () => void;
}

export const ManageChoresModal: React.FC<ManageChoresModalProps> = ({ 
    householdId, 
    onClose, 
    onChoresUpdated 
}) => {
    const [chores, setChores] = useState<HouseholdChore[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingChore, setEditingChore] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<{ name: string; description: string }>({ name: '', description: '' });
    const [deletingChore, setDeletingChore] = useState<string | null>(null);
    const [togglingChore, setTogglingChore] = useState<string | null>(null);

    useEffect(() => {
        loadChores();
    }, [householdId]);

    const loadChores = async () => {
        try {
            setIsLoading(true);
            const choresList = await getHouseholdChores(householdId);
            setChores(choresList);
        } catch (error) {
            console.error('Error loading chores:', error);
            toast.error('Failed to load chores');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartEdit = (chore: HouseholdChore) => {
        setEditingChore(chore.id);
        setEditValues({
            name: chore.name,
            description: chore.description || ''
        });
    };

    const handleCancelEdit = () => {
        setEditingChore(null);
        setEditValues({ name: '', description: '' });
    };

    const handleSaveEdit = async (choreId: string) => {
        if (!editValues.name.trim()) {
            toast.error('Chore name cannot be empty');
            return;
        }

        try {
            await updateHouseholdChore(choreId, {
                name: editValues.name.trim(),
                description: editValues.description.trim() || undefined
            });
            toast.success('Chore updated successfully');
            await loadChores();
            handleCancelEdit();
            onChoresUpdated();
        } catch (error) {
            console.error('Error updating chore:', error);
            toast.error('Failed to update chore');
        }
    };

    const handleToggleActive = async (chore: HouseholdChore) => {
        setTogglingChore(chore.id);
        try {
            await toggleChoreActive(chore.id, !chore.is_active);
            toast.success(`Chore ${!chore.is_active ? 'activated' : 'deactivated'}`);
            await loadChores();
            onChoresUpdated();
        } catch (error) {
            console.error('Error toggling chore:', error);
            toast.error('Failed to update chore status');
        } finally {
            setTogglingChore(null);
        }
    };

    const handleDelete = async (choreId: string) => {
        if (!confirm('Are you sure you want to delete this chore? This will also remove all future assignments.')) {
            return;
        }

        setDeletingChore(choreId);
        try {
            await deleteHouseholdChore(choreId);
            toast.success('Chore deleted successfully');
            await loadChores();
            onChoresUpdated();
        } catch (error) {
            console.error('Error deleting chore:', error);
            toast.error('Failed to delete chore');
        } finally {
            setDeletingChore(null);
        }
    };

    const activeChores = chores.filter(c => c.is_active);
    const inactiveChores = chores.filter(c => !c.is_active);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-semibold text-foreground">Manage Chores</h2>
                    <button
                        onClick={onClose}
                        className="text-secondary-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : chores.length === 0 ? (
                        <div className="text-center py-12">
                            <AlertCircle className="h-12 w-12 text-secondary-foreground mx-auto mb-4" />
                            <p className="text-secondary-foreground">No chores found. Add some chores to get started!</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Active Chores */}
                            {activeChores.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground mb-4">Active Chores</h3>
                                    <div className="space-y-2">
                                        {activeChores.map((chore) => (
                                            <ChoreItem
                                                key={chore.id}
                                                chore={chore}
                                                isEditing={editingChore === chore.id}
                                                editValues={editValues}
                                                onEditValuesChange={setEditValues}
                                                onStartEdit={() => handleStartEdit(chore)}
                                                onCancelEdit={handleCancelEdit}
                                                onSaveEdit={() => handleSaveEdit(chore.id)}
                                                onToggle={() => handleToggleActive(chore)}
                                                onDelete={() => handleDelete(chore.id)}
                                                isToggling={togglingChore === chore.id}
                                                isDeleting={deletingChore === chore.id}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Inactive Chores */}
                            {inactiveChores.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-secondary-foreground mb-4">Inactive Chores</h3>
                                    <div className="space-y-2 opacity-75">
                                        {inactiveChores.map((chore) => (
                                            <ChoreItem
                                                key={chore.id}
                                                chore={chore}
                                                isEditing={editingChore === chore.id}
                                                editValues={editValues}
                                                onEditValuesChange={setEditValues}
                                                onStartEdit={() => handleStartEdit(chore)}
                                                onCancelEdit={handleCancelEdit}
                                                onSaveEdit={() => handleSaveEdit(chore.id)}
                                                onToggle={() => handleToggleActive(chore)}
                                                onDelete={() => handleDelete(chore.id)}
                                                isToggling={togglingChore === chore.id}
                                                isDeleting={deletingChore === chore.id}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Individual chore item component
interface ChoreItemProps {
    chore: HouseholdChore;
    isEditing: boolean;
    editValues: { name: string; description: string };
    onEditValuesChange: (values: { name: string; description: string }) => void;
    onStartEdit: () => void;
    onCancelEdit: () => void;
    onSaveEdit: () => void;
    onToggle: () => void;
    onDelete: () => void;
    isToggling: boolean;
    isDeleting: boolean;
}

const ChoreItem: React.FC<ChoreItemProps> = ({
    chore,
    isEditing,
    editValues,
    onEditValuesChange,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onToggle,
    onDelete,
    isToggling,
    isDeleting
}) => {
    return (
        <div className={`p-4 rounded-lg border ${
            chore.is_active ? 'bg-background border-border' : 'bg-secondary/50 border-secondary'
        }`}>
            {isEditing ? (
                <div className="space-y-3">
                    <Input
                        value={editValues.name}
                        onChange={(e) => onEditValuesChange({ ...editValues, name: e.target.value })}
                        placeholder="Chore name"
                        className="font-medium"
                    />
                    <textarea
                        value={editValues.description}
                        onChange={(e) => onEditValuesChange({ ...editValues, description: e.target.value })}
                        placeholder="Description (optional)"
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                        rows={2}
                    />
                    <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={onCancelEdit}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={onSaveEdit}>
                            <Save className="h-3 w-3 mr-1" />
                            Save
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <h4 className={`font-medium ${!chore.is_active ? 'text-secondary-foreground' : 'text-foreground'}`}>
                            {chore.name}
                            {chore.is_core_chore && (
                                <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                    Core
                                </span>
                            )}
                        </h4>
                        {chore.description && (
                            <p className="text-sm text-secondary-foreground mt-1">{chore.description}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={onStartEdit}
                            className="h-8 w-8"
                        >
                            <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={onToggle}
                            disabled={isToggling}
                            className="h-8 w-8"
                        >
                            {isToggling ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : chore.is_active ? (
                                <ToggleRight className="h-4 w-4 text-primary" />
                            ) : (
                                <ToggleLeft className="h-4 w-4" />
                            )}
                        </Button>
                        {!chore.is_core_chore && (
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={onDelete}
                                disabled={isDeleting}
                                className="h-8 w-8 hover:text-destructive"
                            >
                                {isDeleting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};