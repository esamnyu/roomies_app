// src/components/modals/AddChoreModal.tsx
"use client";

import React, { useState } from 'react';
import { X, Loader2, Info, Check, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { addCustomChoreToHousehold } from '@/lib/api/chores';
import { toast } from 'react-hot-toast';

interface ChoreItem {
    name: string;
    description: string;
}

interface AddChoreModalProps {
    householdId: string;
    onClose: () => void;
    onChoreAdded: () => void;
}

export const AddChoreModal: React.FC<AddChoreModalProps> = ({ 
    householdId, 
    onClose, 
    onChoreAdded 
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedChores, setSelectedChores] = useState<ChoreItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const suggestedChores = [
        { name: 'Kitchen Cleaning', desc: 'Clean counters, appliances, and floors' },
        { name: 'Bathroom Cleaning', desc: 'Clean toilet, shower, sink, and floors' },
        { name: 'Vacuuming', desc: 'Vacuum all carpeted areas' },
        { name: 'Taking Out Trash', desc: 'Empty all bins and take to collection point' },
        { name: 'Grocery Shopping', desc: 'Buy household essentials and shared items' },
        { name: 'Mopping', desc: 'Mop all hard floor surfaces' },
        { name: 'Laundry', desc: 'Wash, dry, and fold shared linens' },
        { name: 'Dusting', desc: 'Dust all surfaces and furniture' }
    ];

    const isChoreSelected = (choreName: string) => {
        return selectedChores.some(chore => chore.name === choreName);
    };

    const handleToggleSuggestion = (suggestion: typeof suggestedChores[0]) => {
        if (isChoreSelected(suggestion.name)) {
            setSelectedChores(prev => prev.filter(chore => chore.name !== suggestion.name));
        } else {
            setSelectedChores(prev => [...prev, { name: suggestion.name, description: suggestion.desc }]);
        }
    };

    const handleAddCustomChore = () => {
        if (!name.trim()) {
            toast.error('Please enter a chore name');
            return;
        }

        if (isChoreSelected(name) || selectedChores.some(chore => chore.name.toLowerCase() === name.toLowerCase())) {
            toast.error('This chore has already been added');
            return;
        }

        setSelectedChores(prev => [...prev, { name: name.trim(), description: description.trim() }]);
        setName('');
        setDescription('');
        toast.success('Chore added to list');
    };

    const handleRemoveChore = (choreName: string) => {
        setSelectedChores(prev => prev.filter(chore => chore.name !== choreName));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (selectedChores.length === 0) {
            toast.error('Please add at least one chore');
            return;
        }

        setIsSubmitting(true);
        let successCount = 0;
        let failedChores: string[] = [];

        try {
            // Add all selected chores
            for (const chore of selectedChores) {
                try {
                    await addCustomChoreToHousehold(
                        householdId, 
                        chore.name, 
                        chore.description || undefined
                    );
                    successCount++;
                } catch (error) {
                    console.error(`Error adding chore ${chore.name}:`, error);
                    failedChores.push(chore.name);
                }
            }

            if (successCount > 0) {
                toast.success(`Successfully added ${successCount} chore${successCount > 1 ? 's' : ''}!`);
                onChoreAdded();
            }

            if (failedChores.length > 0) {
                toast.error(`Failed to add: ${failedChores.join(', ')}`);
            }

            if (failedChores.length === 0) {
                onClose();
            }
        } catch (error) {
            console.error('Error adding chores:', error);
            toast.error('Failed to add chores');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">Add New Chores</h2>
                        <p className="text-sm text-secondary-foreground mt-1">
                            Select from suggestions or add custom chores
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-secondary-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    <div className="space-y-6">
                        {/* Selected Chores List */}
                        {selectedChores.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-foreground mb-3">
                                    Selected Chores ({selectedChores.length})
                                </h3>
                                <div className="space-y-2">
                                    {selectedChores.map((chore) => (
                                        <div 
                                            key={chore.name}
                                            className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg"
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{chore.name}</p>
                                                {chore.description && (
                                                    <p className="text-xs text-secondary-foreground mt-1">
                                                        {chore.description}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveChore(chore.name)}
                                                className="ml-3 p-1 hover:bg-destructive/10 rounded transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Suggestions */}
                        <div>
                            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center">
                                <Info className="h-4 w-4 mr-2 text-primary" />
                                Quick Add Suggestions
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {suggestedChores.map((suggestion) => {
                                    const isSelected = isChoreSelected(suggestion.name);
                                    return (
                                        <button
                                            key={suggestion.name}
                                            type="button"
                                            onClick={() => handleToggleSuggestion(suggestion)}
                                            className={`relative text-left p-3 rounded-lg border transition-all ${
                                                isSelected
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                                            }`}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-2 right-2">
                                                    <Check className="h-4 w-4 text-primary" />
                                                </div>
                                            )}
                                            <p className="font-medium text-sm text-foreground pr-6">
                                                {suggestion.name}
                                            </p>
                                            <p className="text-xs text-secondary-foreground mt-1">
                                                {suggestion.desc}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Custom Chore Form */}
                        <div className="border-t pt-6">
                            <h3 className="text-sm font-medium text-foreground mb-3">
                                Add Custom Chore
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="chore-name" className="block text-sm font-medium text-foreground mb-2">
                                        Chore Name
                                    </label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="chore-name"
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g., Window Cleaning"
                                            maxLength={50}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddCustomChore();
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleAddCustomChore}
                                            variant="outline"
                                            size="icon"
                                            disabled={!name.trim()}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-secondary-foreground mt-1">
                                        {name.length}/50 characters
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="chore-description" className="block text-sm font-medium text-foreground mb-2">
                                        Description <span className="text-secondary-foreground">(optional)</span>
                                    </label>
                                    <textarea
                                        id="chore-description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Add any specific instructions or details..."
                                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                        rows={2}
                                        maxLength={200}
                                    />
                                    <p className="text-xs text-secondary-foreground mt-1">
                                        {description.length}/200 characters
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border bg-secondary/30">
                    <div className="text-sm text-secondary-foreground">
                        {selectedChores.length === 0 ? (
                            'Select chores from suggestions or add custom ones'
                        ) : (
                            `${selectedChores.length} chore${selectedChores.length > 1 ? 's' : ''} selected`
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || selectedChores.length === 0}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Adding {selectedChores.length} Chore{selectedChores.length > 1 ? 's' : ''}...
                                </>
                            ) : (
                                `Add ${selectedChores.length} Chore${selectedChores.length > 1 ? 's' : ''}`
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};