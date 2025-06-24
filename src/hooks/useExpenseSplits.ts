'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
// FIX: Import the more specific 'ExpenseWithDetails' type instead of the base 'Expense'
import type { HouseholdMember, ExpenseWithDetails } from '@/lib/types/types';

export type SplitType = 'equal' | 'custom' | 'percentage';

const PRECISION_THRESHOLD = 0.01;

function correctRoundingErrors(splits: Array<{ user_id: string; amount: number }>, totalAmount: number) {
    const currentTotal = splits.reduce((sum, s) => sum + s.amount, 0);
    const difference = totalAmount - currentTotal;
    if (Math.abs(difference) > (PRECISION_THRESHOLD / 10) && splits.length > 0) {
        const firstSplit = splits.find(s => s.amount > 0);
        if (firstSplit) {
            firstSplit.amount = parseFloat((firstSplit.amount + difference).toFixed(2));
        }
    }
    return splits;
}

// FIX: The hook now accepts an optional 'initialExpense' of type 'ExpenseWithDetails'
export function useExpenseSplits(members: HouseholdMember[], initialExpense?: ExpenseWithDetails) {
    const [amount, setAmount] = useState<number>(initialExpense?.amount ?? 0);
    const [splitType, setSplitType] = useState<SplitType>(
        // This logic now works safely because 'expense_splits' is guaranteed to exist on the type
        initialExpense?.expense_splits && initialExpense.expense_splits.length > 0 ? 'custom' : 'equal'
    );
    const [includedMembers, setIncludedMembers] = useState<Set<string>>(() => new Set(members.map(m => m.user_id)));
    
    const [customSplits, setCustomSplits] = useState<Record<string, number>>(() => {
        if (initialExpense?.expense_splits) {
            return initialExpense.expense_splits.reduce((acc, split) => {
                acc[split.user_id] = split.amount;
                return acc;
            }, {} as Record<string, number>);
        }
        return {};
    });

    const [percentageSplits, setPercentageSplits] = useState<Record<string, number>>({});

    const handleAmountChange = (newAmount: number) => {
        setAmount(isNaN(newAmount) ? 0 : newAmount);
    };

    const toggleMemberInclusion = useCallback((userId: string) => {
        setIncludedMembers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                if (newSet.size > 1) newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    }, []);

    useEffect(() => {
        const activeMembers = Array.from(includedMembers);
        const numMembers = activeMembers.length;

        if (splitType === 'equal') {
            setCustomSplits({});
            setPercentageSplits({});
        } else if (splitType === 'percentage') {
            const equalPercentage = numMembers > 0 ? parseFloat((100 / numMembers).toFixed(2)) : 0;
            const newPercentages = activeMembers.reduce((acc: Record<string, number>, id) => {
                acc[id] = equalPercentage;
                return acc;
            }, {});

            const total = Object.values(newPercentages).reduce((sum, p) => sum + p, 0);
            
            if (total !== 100 && activeMembers.length > 0) {
                 const difference = 100 - total;
                 newPercentages[activeMembers[0]] = parseFloat((newPercentages[activeMembers[0]] + difference).toFixed(2));
            }
            setPercentageSplits(newPercentages);
            setCustomSplits({});
        } else {
            setPercentageSplits({});
        }
    }, [splitType, includedMembers]);


    const finalSplits = useMemo(() => {
        const activeMembers = Array.from(includedMembers);
        if (activeMembers.length === 0 || amount <= 0) return [];

        let splitsArray: Array<{ user_id: string; amount: number }>;

        switch (splitType) {
            case 'custom':
                splitsArray = activeMembers.map(userId => ({
                    user_id: userId,
                    amount: customSplits[userId] || 0
                }));
                break;
            case 'percentage':
                splitsArray = activeMembers.map(userId => {
                    const percentage = percentageSplits[userId] || 0;
                    const splitAmount = parseFloat(((amount * percentage) / 100).toFixed(2));
                    return { user_id: userId, amount: splitAmount };
                });
                break;
            case 'equal':
            default:
                const equalAmount = parseFloat((amount / activeMembers.length).toFixed(2));
                splitsArray = activeMembers.map(userId => ({
                    user_id: userId,
                    amount: equalAmount
                }));
                break;
        }

        if (splitType !== 'custom') {
            return correctRoundingErrors(splitsArray, amount);
        }
        return splitsArray;

    }, [amount, splitType, includedMembers, customSplits, percentageSplits]);

    const totalSplitValue = useMemo(() => finalSplits.reduce((sum, s) => sum + s.amount, 0), [finalSplits]);
    const totalPercentageValue = useMemo(() => Array.from(includedMembers).reduce((sum, id) => sum + (percentageSplits[id] || 0), 0), [includedMembers, percentageSplits]);

    const isValid = useMemo(() => {
        if (amount <= 0 || includedMembers.size === 0) return false;
        if (splitType === 'custom') return Math.abs(totalSplitValue - amount) < PRECISION_THRESHOLD * includedMembers.size;
        if (splitType === 'percentage') return Math.abs(totalPercentageValue - 100) < PRECISION_THRESHOLD * includedMembers.size;
        return true;
    }, [amount, includedMembers.size, splitType, totalSplitValue, totalPercentageValue]);

    return {
        amount,
        setAmount: handleAmountChange,
        splitType,
        setSplitType,
        includedMembers,
        toggleMemberInclusion,
        customSplits,
        setCustomSplits,
        percentageSplits,
        setPercentageSplits,
        finalSplits,
        isValid,
        totalSplitValue,
        totalPercentageValue
    };
}