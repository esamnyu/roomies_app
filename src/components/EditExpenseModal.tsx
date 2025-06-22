// src/components/EditExpenseModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { updateExpense } from '@/lib/api/expenses';
import type { Expense, HouseholdMember } from '@/lib/types/types';
import { useExpenseSplits } from '@/hooks/useExpenseSplits';
import { ExpenseSplitter } from '@/components/ExpenseSplitter';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface EditExpenseModalProps {
  expense: Expense;
  members: HouseholdMember[];
  onClose: () => void;
  onExpenseUpdated: () => void;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({ expense, members, onClose, onExpenseUpdated }) => {
    const [description, setDescription] = useState(expense.description);
    const [date, setDate] = useState(new Date(expense.date).toISOString().split('T')[0]);
    const [paidBy, setPaidBy] = useState(expense.paid_by);
    const [submitting, setSubmitting] = useState(false);

    const {
        amount,
        setAmount,
        splitType,
        setSplitType,
        finalSplits,
        isValid,
        customSplits,
        setCustomSplits,
        ...splitterProps
    } = useExpenseSplits(members);

    useEffect(() => {
        if (expense) {
            setAmount(expense.amount);
            
            const initialSplitsRecord = (expense.expense_splits ?? []).reduce((acc, split) => {
                acc[split.user_id] = split.amount;
                return acc;
            }, {} as Record<string, number>);

            setCustomSplits(initialSplitsRecord);
            setSplitType('custom');
        }
    }, [expense, setAmount, setSplitType, setCustomSplits]);

    const handleSubmit = async () => {
        if (!description || !isValid) return;
        
        setSubmitting(true);
        try {
            await updateExpense(expense.id, {
                description,
                amount,
                splits: finalSplits,
                paid_by: paidBy,
                date: date
            });
            toast.success('Expense updated!');
            onExpenseUpdated();
        } catch (error) {
            console.error('Error updating expense:', error);
            toast.error((error as Error).message || 'Failed to update expense');
        } finally {
            setSubmitting(false);
        }
    };
    
    const selectStyles = "mt-1 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-background rounded-lg p-6 max-w-2xl w-full my-8">
                <h3 className="text-lg font-medium text-foreground mb-4">Edit Expense</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground">Description</label>
                        <Input 
                            type="text" 
                            className="mt-1"
                            value={description} 
                            onChange={(e) => setDescription(e.target.value)} 
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-foreground">Total Amount</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-secondary-foreground sm:text-sm">$</span>
                            </div>
                            <Input 
                                type="number" 
                                step="0.01" 
                                className="pl-7"
                                value={amount || ''} 
                                onChange={(e) => setAmount(parseFloat(e.target.value))}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground">Paid by</label>
                        <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className={selectStyles}>
                            {members.map(member => (
                                <option key={member.user_id} value={member.user_id}>
                                    {member.profiles?.name || 'Unknown'}
                                </option>
                            ))}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-foreground">Date</label>
                         <Input
                            type="date"
                            className="mt-1"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                    
                    <ExpenseSplitter
                        members={members}
                        amount={amount}
                        splitType={splitType}
                        setSplitType={setSplitType}
                        finalSplits={finalSplits}
                        isValid={isValid}
                        customSplits={customSplits}
                        setCustomSplits={setCustomSplits}
                        {...splitterProps}
                    />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button onClick={onClose} variant="secondary" disabled={submitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting || !description || !amount || !isValid}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </div>
    );
};