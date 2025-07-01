// src/components/modals/AddChoreModal.tsx
"use client";

import React, { useState } from 'react';
import { X, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { addCustomChoreToHousehold } from '@/lib/api/chores';
import { toast } from 'react-hot-toast';

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name.trim()) {
            toast.error('Please enter a chore name');
            return;
        }

        setIsSubmitting(true);
        try {
            await addCustomChoreToHousehold(householdId, name.trim(), description.trim() || undefined);
            toast.success('Chore added successfully!');
            onChoreAdded();
            onClose();
        } catch (error) {
            console.error('Error adding chore:', error);
            toast.error('Failed to add chore');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSuggestionClick = (suggestion: typeof suggestedChores[0]) => {
        setName(suggestion.name);
        setDescription(suggestion.desc);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-semibold text-foreground">Add New Chore</h2>
                    <button
                        onClick={onClose}
                        className="text-secondary-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Chore Name */}
                        <div>
                            <label htmlFor="chore-name" className="block text-sm font-medium text-foreground mb-2">
                                Chore Name <span className="text-destructive">*</span>
                            </label>
                            <Input
                                id="chore-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Kitchen Cleaning"
                                maxLength={50}
                                required
                            />
                            <p className="text-xs text-secondary-foreground mt-1">
                                {name.length}/50 characters
                            </p>
                        </div>

                        {/* Description */}
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
                                rows={3}
                                maxLength={200}
                            />
                            <p className="text-xs text-secondary-foreground mt-1">
                                {description.length}/200 characters
                            </p>
                        </div>

                        {/* Suggestions */}
                        <div>
                            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center">
                                <Info className="h-4 w-4 mr-2 text-primary" />
                                Quick Add Suggestions
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {suggestedChores.map((suggestion) => (
                                    <button
                                        key={suggestion.name}
                                        type="button"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className={`text-left p-3 rounded-lg border transition-all ${
                                            name === suggestion.name
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                                        }`}
                                    >
                                        <p className="font-medium text-sm text-foreground">
                                            {suggestion.name}
                                        </p>
                                        <p className="text-xs text-secondary-foreground mt-1">
                                            {suggestion.desc}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-secondary/30">
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
                        disabled={isSubmitting || !name.trim()}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Adding...
                            </>
                        ) : (
                            'Add Chore'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};