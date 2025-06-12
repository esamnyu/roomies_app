// src/components/ExpenseSplitter.tsx
import React from 'react';
// Corrected the import path for HouseholdMember below
import type { HouseholdMember } from '@/lib/types/types';
import type { SplitType } from '@/hooks/useExpenseSplits';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
    finalSplits,
    splitType,
    setSplitType,
    includedMembers,
    toggleMemberInclusion,
    customSplits,
    setCustomSplits,
    percentageSplits,
    setPercentageSplits
}) => {
    
    const getMemberSplitAmount = (userId: string) => {
        const split = finalSplits.find(s => s.user_id === userId);
        return split ? split.amount : 0;
    };

    const checkboxStyles = "h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary";

    return (
        <>
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">How to split?</label>
                <div className="grid grid-cols-3 gap-2">
                    {(['equal', 'custom', 'percentage'] as SplitType[]).map(type => (
                        <Button
                          key={type}
                          type="button"
                          onClick={() => setSplitType(type)}
                          variant={splitType === type ? 'default' : 'outline'}
                          className="capitalize"
                        >
                            {type}
                        </Button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                    Split between ({includedMembers.size} {includedMembers.size === 1 ? 'person' : 'people'})
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto border border-input rounded-md p-3">
                    {members.map(member => (
                        <div key={member.user_id} className="flex items-center justify-between p-2 hover:bg-secondary rounded">
                            <div className="flex items-center flex-1">
                                <input type="checkbox" checked={includedMembers.has(member.user_id)} onChange={() => toggleMemberInclusion(member.user_id)} className={checkboxStyles} />
                                <label className="ml-2 text-sm font-medium text-foreground">{member.profiles?.name}</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                {splitType === 'custom' && includedMembers.has(member.user_id) && (
                                    <div className="flex items-center">
                                        <span className="text-secondary-foreground mr-1">$</span>
                                        <Input type="number" step="0.01" className="h-9 w-24" value={customSplits[member.user_id] || ''} onChange={(e) => setCustomSplits({ ...customSplits, [member.user_id]: parseFloat(e.target.value) || 0 })}/>
                                    </div>
                                )}
                                {splitType === 'percentage' && includedMembers.has(member.user_id) && (
                                     <div className="flex items-center">
                                        <Input type="number" step="0.01" min="0" max="100" className="h-9 w-20" value={percentageSplits[member.user_id] || ''} onChange={(e) => setPercentageSplits({ ...percentageSplits, [member.user_id]: parseFloat(e.target.value) || 0 })} />
                                        <span className="text-secondary-foreground ml-1">%</span>
                                    </div>
                                )}
                                <span className={`text-sm font-medium w-16 text-right ${includedMembers.has(member.user_id) ? 'text-foreground' : 'text-secondary-foreground/50'}`}>
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
