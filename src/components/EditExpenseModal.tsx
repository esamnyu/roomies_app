// src/components/EditExpenseModal.tsx
"use client";

// MODIFIED: Removed useEffect from import
import React, { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { updateExpense } from '@/lib/api/expenses';
import type { Expense, HouseholdMember, UpdateExpensePayload } from '@/lib/types/types';
import { useExpenseSplits } from '@/hooks/useExpenseSplits';
import { ExpenseSplitter } from '@/components/ExpenseSplitter';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const SettledExpenseWarningDialog = ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void; }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]">
        <div className="bg-background rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
                <h3 className="text-lg font-bold text-foreground">
                    Settled Splits Affected
                </h3>
            </div>
            <p className="text-sm text-secondary-foreground mb-6">
                You are editing an expense that has already been settled by one or more members.
                Proceeding will create adjustments to their balances. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
                <Button onClick={onCancel} variant="secondary">Cancel Edit</Button>
                <Button onClick={onConfirm} variant="destructive">Proceed Anyway</Button>
            </div>
        </div>
    </div>
);


interface EditExpenseModalProps {
  expense: Expense;
  members: HouseholdMember[];
  onClose: () => void;
  onExpenseUpdated: () => void;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({ expense, members, onClose, onExpenseUpdated }) => {
    // MODIFIED: State is initialized directly from props. This happens only once.
    const [description, setDescription] = useState(expense.description);
    const [date, setDate] = useState(new Date(expense.date).toISOString().split('T')[0]);
    const [paidBy, setPaidBy] = useState(expense.paid_by);
    const [submitting, setSubmitting] = useState(false);
    
    const [showWarning, setShowWarning] = useState(false);
    const [pendingUpdatePayload, setPendingUpdatePayload] = useState<UpdateExpensePayload | null>(null);

    // MODIFIED: The expense data is now passed to the hook for proper initialization.
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
    } = useExpenseSplits(members, expense);

    // REMOVED: The problematic useEffect hook has been completely removed.
    // This was the source of the state reverting issue.

    const handleSubmit = async () => {
        if (!description || !isValid) return;

        const payload: UpdateExpensePayload = {
            description,
            amount,
            splits: finalSplits,
            paid_by: paidBy,
            date: date
        };
        
        setSubmitting(true);
        try {
            const result = await updateExpense(expense.id, payload);

            if (result.adjustments_made) {
                setPendingUpdatePayload(payload);
                setShowWarning(true);
            } else {
                toast.success('Expense updated!');
                onExpenseUpdated();
                // We close the modal here by calling onClose
                onClose(); 
            }
        } catch (error) {
            console.error('Error updating expense:', error);
            toast.error((error as Error).message || 'Failed to update expense');
            setSubmitting(false);
        }
    };

    const handleConfirmUpdate = async () => {
        if (!pendingUpdatePayload) return;
        setShowWarning(false);
        setSubmitting(false);
        toast.success('Expense updated with adjustments!');
        onExpenseUpdated();
        setPendingUpdatePayload(null);
        // We close the modal here by calling onClose
        onClose();
    };

    const handleCancelUpdate = () => {
        setShowWarning(false);
        setSubmitting(false);
        setPendingUpdatePayload(null); 
        // We still refresh the data because the change was already committed to the DB
        onExpenseUpdated(); 
    };
    
    const selectStyles = "mt-1 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

    return (
        <>
            {showWarning && (
                <SettledExpenseWarningDialog
                    onConfirm={handleConfirmUpdate}
                    onCancel={handleCancelUpdate}
                />
            )}
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                <div className="bg-background rounded-lg p-6 max-w-2xl w-full my-8">
                    <h3 className="text-lg font-medium text-foreground mb-4">Edit Expense</h3>
                    <div className="space-y-4">
                        {/* Form fields remain the same */}
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
        </>
    );
};
