// src/components/ExpenseSplitterV2.tsx
import React from 'react';
import { Users, DollarSign, Percent, Calculator } from 'lucide-react';
import type { HouseholdMember } from '@/lib/types/types';
import type { SplitType } from '@/hooks/useExpenseSplits';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface ExpenseSplitterV2Props {
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

export const ExpenseSplitterV2: React.FC<ExpenseSplitterV2Props> = ({
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
    finalSplits,
    isValid,
    totalSplitValue,
    totalPercentageValue
}) => {
    
    const getMemberSplitAmount = (userId: string) => {
        const split = finalSplits.find(s => s.user_id === userId);
        return split ? split.amount : 0;
    };

    const splitTypeConfig = {
        equal: { icon: Users, label: 'Split Equally', color: 'text-primary' },
        custom: { icon: Calculator, label: 'Custom Amounts', color: 'text-blue-600' },
        percentage: { icon: Percent, label: 'By Percentage', color: 'text-purple-600' }
    };

    const remainingAmount = amount - totalSplitValue;
    const remainingPercentage = 100 - totalPercentageValue;

    return (
        <div className="space-y-6">
            {/* Split Type Selection */}
            <div>
                <label className="block text-sm font-semibold text-foreground mb-3">How should we split this?</label>
                <div className="grid grid-cols-3 gap-3">
                    {(['equal', 'custom', 'percentage'] as SplitType[]).map(type => {
                        const config = splitTypeConfig[type];
                        const Icon = config.icon;
                        return (
                            <Button
                                key={type}
                                type="button"
                                onClick={() => setSplitType(type)}
                                variant={splitType === type ? 'default' : 'outline'}
                                className={`relative flex flex-col items-center p-4 h-auto ${
                                    splitType === type ? '' : 'hover:border-primary/50'
                                }`}
                            >
                                <Icon className={`h-5 w-5 mb-1 ${splitType === type ? 'text-primary-foreground' : config.color}`} />
                                <span className="text-xs">{config.label}</span>
                                {splitType === type && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"></div>
                                )}
                            </Button>
                        );
                    })}
                </div>
            </div>

            {/* Member Selection and Split Configuration */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-foreground">
                        Who's included? ({includedMembers.size} {includedMembers.size === 1 ? 'person' : 'people'})
                    </label>
                    {amount > 0 && (
                        <span className="text-sm text-secondary-foreground">
                            Total: ${amount.toFixed(2)}
                        </span>
                    )}
                </div>

                {/* Validation Messages */}
                {!isValid && amount > 0 && (
                    <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-sm text-destructive">
                            {splitType === 'custom' && totalSplitValue !== amount && (
                                <>Split amounts don't match the total. {remainingAmount > 0 ? `$${remainingAmount.toFixed(2)} remaining` : `$${Math.abs(remainingAmount).toFixed(2)} over`}</>
                            )}
                            {splitType === 'percentage' && Math.abs(totalPercentageValue - 100) > 0.01 && (
                                <>Percentages must equal 100%. Currently: {totalPercentageValue.toFixed(1)}%</>
                            )}
                            {includedMembers.size === 0 && 'Please select at least one person'}
                        </p>
                    </div>
                )}

                {/* Members List */}
                <div className="space-y-2 max-h-64 overflow-y-auto border border-input rounded-lg p-3 bg-secondary/30">
                    {members.map(member => {
                        const isIncluded = includedMembers.has(member.user_id);
                        const splitAmount = getMemberSplitAmount(member.user_id);
                        
                        return (
                            <div 
                                key={member.user_id} 
                                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                                    isIncluded ? 'bg-background shadow-sm border border-border' : 'bg-secondary/50'
                                }`}
                            >
                                <div className="flex items-center flex-1">
                                    <input 
                                        type="checkbox" 
                                        checked={isIncluded} 
                                        onChange={() => toggleMemberInclusion(member.user_id)} 
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-2"
                                    />
                                    <div className="ml-3 flex items-center space-x-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                            isIncluded ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                                        }`}>
                                            {member.profiles?.name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <label className={`text-sm font-medium cursor-pointer ${
                                            isIncluded ? 'text-foreground' : 'text-secondary-foreground'
                                        }`}>
                                            {member.profiles?.name}
                                        </label>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-3">
                                    {/* Custom Amount Input */}
                                    {splitType === 'custom' && isIncluded && (
                                        <div className="flex items-center">
                                            <span className="text-secondary-foreground mr-1">$</span>
                                            <Input 
                                                type="number" 
                                                step="0.01" 
                                                className="h-8 w-24 text-right" 
                                                value={customSplits[member.user_id] || ''} 
                                                onChange={(e) => setCustomSplits({ 
                                                    ...customSplits, 
                                                    [member.user_id]: parseFloat(e.target.value) || 0 
                                                })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    )}

                                    {/* Percentage Input */}
                                    {splitType === 'percentage' && isIncluded && (
                                        <div className="flex items-center">
                                            <Input 
                                                type="number" 
                                                step="0.01" 
                                                min="0" 
                                                max="100" 
                                                className="h-8 w-20 text-right" 
                                                value={percentageSplits[member.user_id] || ''} 
                                                onChange={(e) => setPercentageSplits({ 
                                                    ...percentageSplits, 
                                                    [member.user_id]: parseFloat(e.target.value) || 0 
                                                })} 
                                                placeholder="0"
                                            />
                                            <span className="text-secondary-foreground ml-1">%</span>
                                        </div>
                                    )}

                                    {/* Split Amount Display */}
                                    <div className={`text-sm font-semibold min-w-[80px] text-right p-2 rounded-md ${
                                        isIncluded && splitAmount > 0 
                                            ? 'bg-primary/10 text-primary' 
                                            : 'text-secondary-foreground/50'
                                    }`}>
                                        {isIncluded && splitAmount > 0 ? (
                                            <>
                                                <DollarSign className="inline h-3 w-3" />
                                                {splitAmount.toFixed(2)}
                                            </>
                                        ) : (
                                            '$0.00'
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Helper Text */}
                {splitType === 'equal' && includedMembers.size > 0 && amount > 0 && (
                    <p className="mt-2 text-xs text-secondary-foreground text-center">
                        Each selected person will pay ${(amount / includedMembers.size).toFixed(2)}
                    </p>
                )}
                {splitType === 'percentage' && (
                    <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-secondary-foreground">Total percentage:</span>
                        <span className={`font-medium ${Math.abs(totalPercentageValue - 100) < 0.01 ? 'text-primary' : 'text-destructive'}`}>
                            {totalPercentageValue.toFixed(1)}%
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};