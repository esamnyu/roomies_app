// src/hooks/useExpenseSplits.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { HouseholdMember } from '@/lib/types/types';

export type SplitType = 'equal' | 'custom' | 'percentage';

const PRECISION_THRESHOLD = 0.01; // Define a constant for precision

// This function corrects for rounding errors to ensure the total split amount equals the expense amount.
function correctRoundingErrors(splits: Array<{ user_id: string; amount: number }>, totalAmount: number) {
    const currentTotal = splits.reduce((sum, s) => sum + s.amount, 0);
    const difference = totalAmount - currentTotal;
    if (Math.abs(difference) > (PRECISION_THRESHOLD / 10) && splits.length > 0) { // Use the constant
        const firstSplit = splits.find(s => s.amount > 0);
        if (firstSplit) {
            firstSplit.amount = parseFloat((firstSplit.amount + difference).toFixed(2));
        }
    }
    return splits;
}


export function useExpenseSplits(members: HouseholdMember[]) {
    const [amount, setAmount] = useState<number>(0);
    const [splitType, setSplitType] = useState<SplitType>('equal');
    const [includedMembers, setIncludedMembers] = useState<Set<string>>(() => new Set(members.map(m => m.user_id)));
    const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
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

    // Effect to reset splits when split type or included members change
    useEffect(() => {
        const activeMembers = Array.from(includedMembers);
        const numMembers = activeMembers.length;

        if (splitType === 'equal') {
            setCustomSplits({});
            setPercentageSplits({});
        } else if (splitType === 'percentage') {
            const equalPercentage = numMembers > 0 ? parseFloat((100 / numMembers).toFixed(2)) : 0;
            // Explicitly type the accumulator to fix the TS error
            const newPercentages = activeMembers.reduce((acc: Record<string, number>, id) => {
                acc[id] = equalPercentage;
                return acc;
            }, {});

            const total = Object.values(newPercentages).reduce((sum, p) => sum + p, 0);
            
            // Correct rounding errors
            if (total !== 100 && activeMembers.length > 0) {
                 const difference = 100 - total;
                 newPercentages[activeMembers[0]] = parseFloat((newPercentages[activeMembers[0]] + difference).toFixed(2));
            }

            setPercentageSplits(newPercentages);
            setCustomSplits({});
        } else { // custom
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

        // Always correct for rounding errors unless it's a pure custom split
        if (splitType !== 'custom') {
            return correctRoundingErrors(splitsArray, amount);
        }
        return splitsArray;

    }, [amount, splitType, includedMembers, customSplits, percentageSplits]);

    const totalSplitValue = useMemo(() => finalSplits.reduce((sum, s) => sum + s.amount, 0), [finalSplits]);
    const totalPercentageValue = useMemo(() => Array.from(includedMembers).reduce((sum, id) => sum + (percentageSplits[id] || 0), 0), [includedMembers, percentageSplits]);

    const isValid = useMemo(() => {
        if (amount <= 0 || includedMembers.size === 0) return false;
        // Use the constant for precision checks
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




// // src/hooks/useExpenseSplits.ts
// import { useState, useEffect, useMemo, useCallback } from 'react';
// import type { HouseholdMember } from '@/lib/types/types';

// export type SplitType = 'equal' | 'custom' | 'percentage';

// const PRECISION_THRESHOLD = 0.01; // Define a constant for precision

// // This function corrects for rounding errors to ensure the total split amount equals the expense amount.
// function correctRoundingErrors(splits: Array<{ user_id: string; amount: number }>, totalAmount: number) {
//     const currentTotal = splits.reduce((sum, s) => sum + s.amount, 0);
//     const difference = totalAmount - currentTotal;
//     if (Math.abs(difference) > (PRECISION_THRESHOLD / 10) && splits.length > 0) { // Use the constant
//         const firstSplit = splits.find(s => s.amount > 0);
//         if (firstSplit) {
//             firstSplit.amount = parseFloat((firstSplit.amount + difference).toFixed(2));
//         }
//     }
//     return splits;
// }


// export function useExpenseSplits(members: HouseholdMember[]) {
//     const [amount, setAmount] = useState<number>(0);
//     const [splitType, setSplitType] = useState<SplitType>('equal');
//     const [includedMembers, setIncludedMembers] = useState<Set<string>>(() => new Set(members.map(m => m.user_id)));
//     const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
//     const [percentageSplits, setPercentageSplits] = useState<Record<string, number>>({});

//     const handleAmountChange = (newAmount: number) => {
//         setAmount(isNaN(newAmount) ? 0 : newAmount);
//     };

//     const toggleMemberInclusion = useCallback((userId: string) => {
//         setIncludedMembers(prev => {
//             const newSet = new Set(prev);
//             if (newSet.has(userId)) {
//                 if (newSet.size > 1) newSet.delete(userId);
//             } else {
//                 newSet.add(userId);
//             }
//             return newSet;
//         });
//     }, []);

//     // Effect to reset splits when split type or included members change
//     useEffect(() => {
//         const activeMembers = Array.from(includedMembers);
//         const numMembers = activeMembers.length;

//         if (splitType === 'equal') {
//             const equalAmount = numMembers > 0 ? parseFloat((amount / numMembers).toFixed(2)) : 0;
//             setCustomSplits(activeMembers.reduce((acc, id) => ({ ...acc, [id]: equalAmount }), {}));
//         } else if (splitType === 'percentage') {
//             const equalPercentage = numMembers > 0 ? parseFloat((100 / numMembers).toFixed(2)) : 0;
//             setPercentageSplits(activeMembers.reduce((acc, id) => ({ ...acc, [id]: equalPercentage }), {}));
//         } else {
//             setCustomSplits({});
//         }
//     }, [splitType, includedMembers, amount]);


//     const finalSplits = useMemo(() => {
//         const activeMembers = Array.from(includedMembers);
//         if (activeMembers.length === 0 || amount <= 0) return [];

//         let splitsArray: Array<{ user_id: string; amount: number }>;

//         switch (splitType) {
//             case 'custom':
//                 splitsArray = activeMembers.map(userId => ({
//                     user_id: userId,
//                     amount: customSplits[userId] || 0
//                 }));
//                 break;
//             case 'percentage':
//                 splitsArray = activeMembers.map(userId => {
//                     const percentage = percentageSplits[userId] || 0;
//                     const splitAmount = parseFloat(((amount * percentage) / 100).toFixed(2));
//                     return { user_id: userId, amount: splitAmount };
//                 });
//                 break;
//             case 'equal':
//             default:
//                 const equalAmount = parseFloat((amount / activeMembers.length).toFixed(2));
//                 splitsArray = activeMembers.map(userId => ({
//                     user_id: userId,
//                     amount: equalAmount
//                 }));
//                 break;
//         }

//         // Always correct for rounding errors unless it's a pure custom split
//         if (splitType !== 'custom') {
//             return correctRoundingErrors(splitsArray, amount);
//         }
//         return splitsArray;

//     }, [amount, splitType, includedMembers, customSplits, percentageSplits]);

//     const totalSplitValue = useMemo(() => finalSplits.reduce((sum, s) => sum + s.amount, 0), [finalSplits]);
//     const totalPercentageValue = useMemo(() => Array.from(includedMembers).reduce((sum, id) => sum + (percentageSplits[id] || 0), 0), [includedMembers, percentageSplits]);

//     const isValid = useMemo(() => {
//         if (amount <= 0 || includedMembers.size === 0) return false;
//         // Use the constant for precision checks
//         if (splitType === 'custom') return Math.abs(totalSplitValue - amount) < PRECISION_THRESHOLD * includedMembers.size;
//         if (splitType === 'percentage') return Math.abs(totalPercentageValue - 100) < PRECISION_THRESHOLD * includedMembers.size;
//         return true;
//     }, [amount, includedMembers.size, splitType, totalSplitValue, totalPercentageValue]);

//     return {
//         amount,
//         setAmount: handleAmountChange,
//         splitType,
//         setSplitType,
//         includedMembers,
//         toggleMemberInclusion,
//         customSplits,
//         setCustomSplits,
//         percentageSplits,
//         setPercentageSplits,
//         finalSplits,
//         isValid,
//         totalSplitValue,
//         totalPercentageValue
//     };
// }