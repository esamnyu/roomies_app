// src/components/modals/SettleUpModalV2.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, ArrowRight, Info } from 'lucide-react';
import { createSettlement } from '@/lib/api/settlements';
import { toast } from 'react-hot-toast';
import type { HouseholdMember, SettlementSuggestion } from '@/lib/types/types';
import { useAuth } from '../AuthProvider';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';

interface SettleUpModalV2Props {
  householdId: string;
  members: HouseholdMember[];
  settlementSuggestions: SettlementSuggestion[];
  onClose: () => void;
  onSettlementCreated: () => void;
}

export const SettleUpModalV2: React.FC<SettleUpModalV2Props> = ({ 
  householdId, 
  members, 
  settlementSuggestions, 
  onClose, 
  onSettlementCreated 
}) => {
    const { user } = useAuth();
    const [selectedDebt, setSelectedDebt] = useState<SettlementSuggestion | null>(null);
    const [customAmount, setCustomAmount] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showCustom, setShowCustom] = useState(false);

    const myDebts = settlementSuggestions.filter(s => s.from === user?.id);
    const owedToMe = settlementSuggestions.filter(s => s.to === user?.id);
    
    useEffect(() => {
        if (selectedDebt) {
            setCustomAmount(selectedDebt.amount.toString());
            const toProfile = members.find(m => m.user_id === selectedDebt.to)?.profiles;
            setDescription(`Payment to ${toProfile?.name || 'member'}`);
        }
    }, [selectedDebt, members]);

    const handleSubmit = async () => {
        if (!selectedDebt || !customAmount || !householdId || !user) {
            toast.error("Please select a debt to settle.");
            return;
        }
        
        const amount = parseFloat(customAmount);
        
        if (isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid amount greater than 0');
            return;
        }

        if (amount > selectedDebt.amount) {
            toast.error(`You cannot pay more than you owe ($${selectedDebt.amount.toFixed(2)})`);
            return;
        }

        setSubmitting(true);
        try {
            await createSettlement({
                household_id: householdId,
                payer_id: user.id,
                payee_id: selectedDebt.to,
                amount,
                description,
            });
            onSettlementCreated();
            onClose();
            toast.success('Payment recorded successfully!');
        } catch (error) {
            console.error('Error creating settlement:', error);
            toast.error((error as Error).message || 'Failed to record payment');
        } finally {
            setSubmitting(false);
        }
    };

    const getMemberName = (userId: string) => {
        return members.find(m => m.user_id === userId)?.profiles?.name || 'Unknown';
    };

    if (myDebts.length === 0) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-background rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Settle Up</h3>
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Info className="h-8 w-8 text-primary" />
                        </div>
                        <p className="text-foreground font-medium mb-2">You're all settled up!</p>
                        <p className="text-sm text-secondary-foreground">
                            You don't owe anyone in your household.
                        </p>
                    </div>
                    <div className="mt-6">
                        <Button onClick={onClose} variant="secondary" className="w-full">Close</Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-background rounded-lg p-6 max-w-2xl w-full my-8">
                <h3 className="text-lg font-semibold text-foreground mb-6">Settle Up Your Debts</h3>
                
                {/* Outstanding Debts */}
                <div className="mb-6">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Select a debt to settle:</h4>
                    <div className="space-y-2">
                        {myDebts.map((debt, idx) => {
                            const isSelected = selectedDebt === debt;
                            const toName = getMemberName(debt.to);
                            
                            return (
                                <button
                                    key={`debt-${idx}`}
                                    onClick={() => {
                                        setSelectedDebt(debt);
                                        setShowCustom(false);
                                    }}
                                    className={`w-full p-4 rounded-lg border-2 transition-all ${
                                        isSelected 
                                            ? 'border-primary bg-primary/5 shadow-sm' 
                                            : 'border-border hover:border-primary/50 bg-background'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                                                isSelected ? 'bg-primary text-primary-foreground' : 'bg-orange-100 text-orange-700'
                                            }`}>
                                                {toName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="text-left">
                                                <p className="font-medium text-foreground">
                                                    Pay {toName}
                                                </p>
                                                <p className="text-sm text-secondary-foreground">
                                                    You owe {toName}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xl font-bold text-orange-600">
                                                ${debt.amount.toFixed(2)}
                                            </span>
                                            {isSelected && (
                                                <ArrowRight className="h-5 w-5 text-primary" />
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Payment Details */}
                {selectedDebt && (
                    <div className="border-t border-border pt-6">
                        <h4 className="text-sm font-semibold text-foreground mb-4">Payment Details</h4>
                        
                        <div className="bg-secondary/30 rounded-lg p-4 mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-secondary-foreground">Paying to:</span>
                                <span className="font-medium text-foreground">{getMemberName(selectedDebt.to)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-secondary-foreground">Full amount owed:</span>
                                <span className="font-medium text-foreground">${selectedDebt.amount.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Amount Options */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    How much are you paying?
                                </label>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <Button
                                        type="button"
                                        variant={!showCustom ? "primary" : "outline"}
                                        onClick={() => {
                                            setShowCustom(false);
                                            setCustomAmount(selectedDebt.amount.toString());
                                        }}
                                    >
                                        Full Amount (${selectedDebt.amount.toFixed(2)})
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={showCustom ? "primary" : "outline"}
                                        onClick={() => setShowCustom(true)}
                                    >
                                        Custom Amount
                                    </Button>
                                </div>
                                
                                {showCustom && (
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-foreground">$</span>
                                        <Input 
                                            type="number" 
                                            step="0.01" 
                                            className="pl-7"
                                            value={customAmount} 
                                            onChange={(e) => setCustomAmount(e.target.value)}
                                            placeholder="0.00"
                                            max={selectedDebt.amount}
                                        />
                                        {parseFloat(customAmount) < selectedDebt.amount && parseFloat(customAmount) > 0 && (
                                            <p className="text-xs text-secondary-foreground mt-1">
                                                Remaining balance: ${(selectedDebt.amount - parseFloat(customAmount)).toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Description (optional)
                                </label>
                                <Input 
                                    type="text" 
                                    value={description} 
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Payment for expenses..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Who owes you (info only) */}
                {owedToMe.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-border">
                        <h4 className="text-sm font-semibold text-secondary-foreground mb-3">
                            For your reference - People who owe you:
                        </h4>
                        <div className="space-y-2">
                            {owedToMe.map((debt, idx) => (
                                <div key={`owed-${idx}`} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-emerald-200 rounded-full flex items-center justify-center text-emerald-700 text-sm font-medium">
                                            {getMemberName(debt.from).charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-sm text-foreground">
                                            {getMemberName(debt.from)} owes you
                                        </span>
                                    </div>
                                    <span className="font-medium text-emerald-600">
                                        ${debt.amount.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="mt-6 flex justify-end space-x-3">
                    <Button onClick={onClose} variant="secondary" disabled={submitting}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={submitting || !selectedDebt || !customAmount || parseFloat(customAmount) <= 0}
                    >
                        {submitting ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
                        ) : (
                            <>Record Payment</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};