// src/components/chores/EmptyChoreState.tsx
"use client";
import React from 'react';
import { Sparkles, Plus, Settings, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface EmptyChoreStateProps {
    isAdmin: boolean;
    onAddChore?: () => void;
}

export const EmptyChoreState: React.FC<EmptyChoreStateProps> = ({ isAdmin, onAddChore }) => {
    const suggestedChores = [
        'Kitchen Cleaning',
        'Bathroom Cleaning',
        'Vacuuming',
        'Taking Out Trash',
        'Grocery Shopping'
    ];

    return (
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-8 border border-primary/20">
            <div className="max-w-2xl mx-auto text-center space-y-6">
                <div className="space-y-4">
                    <Sparkles className="h-16 w-16 text-primary mx-auto" />
                    <h2 className="text-2xl font-bold text-gray-900">
                        {isAdmin ? 'Set Up Your Chore System' : 'No Chores Yet'}
                    </h2>
                    <p className="text-gray-600 max-w-md mx-auto">
                        {isAdmin 
                            ? 'Get started by adding chores and generating a schedule for your household.'
                            : 'Your household admin will set up chores and assign tasks to members.'}
                    </p>
                </div>

                {isAdmin && (
                    <>
                        <div className="bg-white rounded-xl p-6 shadow-sm border">
                            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                Quick Setup Guide
                            </h3>
                            <div className="space-y-3 text-left">
                                <div className="flex items-start gap-3">
                                    <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                                        1
                                    </div>
                                    <div>
                                        <p className="font-medium">Add household chores</p>
                                        <p className="text-sm text-gray-600">Start with common tasks or create custom ones</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                                        2
                                    </div>
                                    <div>
                                        <p className="font-medium">Configure rotation settings</p>
                                        <p className="text-sm text-gray-600">Choose frequency and assignment method</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                                        3
                                    </div>
                                    <div>
                                        <p className="font-medium">Generate schedule</p>
                                        <p className="text-sm text-gray-600">Create a 6-month rotation automatically</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/50 rounded-xl p-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Popular chores to get started:</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {suggestedChores.map((chore) => (
                                    <span key={chore} className="bg-white px-3 py-1 rounded-full text-sm border">
                                        {chore}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button 
                                onClick={onAddChore}
                                size="lg"
                                className="group"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Add Your First Chore
                                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                            <Button 
                                onClick={() => console.log('TODO: Chore settings')}
                                variant="outline"
                                size="lg"
                            >
                                <Settings className="h-5 w-5 mr-2" />
                                Configure Settings
                            </Button>
                        </div>
                    </>
                )}

                {!isAdmin && (
                    <div className="bg-white/50 rounded-xl p-6">
                        <p className="text-sm text-gray-600">
                            Contact your household admin to set up the chore system. Once configured, you'll see your assigned tasks here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};