// src/components/ExpenseSplitter.tsx
import React from 'react';
import type { HouseholdMember } from '@/lib/api';
import type { SplitType } from '@/hooks/useExpenseSplits';

// Define a more specific type for the props this component needs
interface ExpenseSplitterProps {
    members: HouseholdMember[];
    amount: number;
    splitType: SplitType;
    setSplitType: (type: SplitType) => void;
    includedMembers: Set<string>;
    toggleMemberInclusion: (userId: string) => void;
    customSplits: Record<string, number>;
    setCustomSplits: (splits: Record<string, number>) => void;
    percentageSplits: Record<string, number>;
    setPercentageSplits: (splits: Record<string, number>) => void;
    finalSplits: Array<{ user_id: string; amount: number }>;
    isValid: boolean;
    totalSplitValue: number;
    totalPercentageValue: number;
}

export const ExpenseSplitter: React.FC<ExpenseSplitterProps> = ({
    members,
    amount,
    splitType,
    setSplitType,
    includedMembers,
    toggleMemberInclusion,
    customSplits,
    setCustomSplits,
    percentageSplits,
    setPercentageSplits,
    finalSplits
}) => {
    
    const getMemberSplitAmount = (userId: string) => {
        const split = finalSplits.find(s => s.user_id === userId);
        return split ? split.amount : 0;
    };

    return (
        <>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">How to split?</label>
                <div className="grid grid-cols-3 gap-2">
                    {(['equal', 'custom', 'percentage'] as SplitType[]).map(type => (
                        <button key={type} type="button" onClick={() => setSplitType(type)} className={`btn capitalize ${splitType === type ? 'btn-primary' : 'btn-secondary-outline'}`}>
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Split between ({includedMembers.size} {includedMembers.size === 1 ? 'person' : 'people'})
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {members.map(member => (
                        <div key={member.user_id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                            <div className="flex items-center flex-1">
                                <input type="checkbox" checked={includedMembers.has(member.user_id)} onChange={() => toggleMemberInclusion(member.user_id)} className="h-4 w-4 checkbox" />
                                <label className="ml-2 text-sm font-medium text-gray-700">{member.profiles?.name}</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                {splitType === 'custom' && includedMembers.has(member.user_id) && (
                                    <div className="flex items-center">
                                        <span className="text-gray-500 mr-1">$</span>
                                        <input type="number" step="0.01" className="w-20 input-sm" value={customSplits[member.user_id] || ''} onChange={(e) => setCustomSplits({ ...customSplits, [member.user_id]: parseFloat(e.target.value) || 0 })}/>
                                    </div>
                                )}
                                {splitType === 'percentage' && includedMembers.has(member.user_id) && (
                                     <div className="flex items-center">
                                        <input type="number" step="0.01" min="0" max="100" className="w-16 input-sm" value={percentageSplits[member.user_id] || ''} onChange={(e) => setPercentageSplits({ ...percentageSplits, [member.user_id]: parseFloat(e.target.value) || 0 })} />
                                        <span className="text-gray-500 ml-1">%</span>
                                    </div>
                                )}
                                <span className={`text-sm font-medium ${includedMembers.has(member.user_id) ? 'text-gray-900' : 'text-gray-400'}`}>
                                    ${getMemberSplitAmount(member.user_id).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};