// src/components/BalanceSummaryCard.tsx
import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { SimpleTransactionHistory } from './SimpleTransactionHistory';
import { LedgerTransactionHistory } from './LedgerTransactionHistory';
import type { SettlementSuggestion, Profile } from '@/lib/types/types';

interface Balance {
    userId: string;
    balance: number;
    profile: Profile;
}

interface BalanceSummaryCardProps {
    balances: Balance[];
    currentUserId: string;
    householdId: string;
    settlementSuggestions: SettlementSuggestion[];
    onSettleUp: (suggestion: SettlementSuggestion) => void;
}

export const BalanceSummaryCard: React.FC<BalanceSummaryCardProps> = ({
    balances,
    currentUserId,
    householdId,
    settlementSuggestions,
    onSettleUp
}) => {
    const currentUserBalance = balances.find(b => b.userId === currentUserId)?.balance || 0;
    const currentUserProfile = balances.find(b => b.userId === currentUserId)?.profile;
    const isSettled = Math.abs(currentUserBalance) < 0.01;
    
    // Get who owes the current user and who the current user owes
    const debtsToMe = settlementSuggestions.filter(s => s.to === currentUserId);
    const myDebts = settlementSuggestions.filter(s => s.from === currentUserId);
    
    return (
        <div className="bg-background rounded-lg shadow-sm border border-border overflow-hidden">
            <div className="p-6">
                {/* Overall Balance Header */}
                <div className={`text-center p-4 rounded-lg mb-6 ${
                    isSettled ? 'bg-primary/10 border border-primary/20' : 
                    currentUserBalance > 0 ? 'bg-emerald-50 border border-emerald-200' : 
                    'bg-orange-50 border border-orange-200'
                }`}>
                    {isSettled ? (
                        <div className="flex items-center justify-center space-x-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            <p className="text-lg font-semibold text-primary">You're all settled up!</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm text-secondary-foreground mb-1">Your overall balance</p>
                            <p className={`text-3xl font-bold ${
                                currentUserBalance > 0 ? 'text-emerald-600' : 'text-orange-600'
                            }`}>
                                {currentUserBalance > 0 ? '+' : '-'}${Math.abs(currentUserBalance).toFixed(2)}
                            </p>
                            <p className="text-sm text-secondary-foreground mt-1">
                                {currentUserBalance > 0 ? 'You are owed' : 'You owe'}
                            </p>
                            <div className="mt-2 flex gap-2">
                                <SimpleTransactionHistory
                                    householdId={householdId}
                                    userId={currentUserId}
                                    userName="You"
                                />
                                <LedgerTransactionHistory
                                    householdId={householdId}
                                    userId={currentUserId}
                                    userName="You"
                                    currentBalance={currentUserBalance}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Detailed Breakdown */}
                {!isSettled && (
                    <div className="space-y-4">
                        {/* People who owe you */}
                        {debtsToMe.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                                    People who owe you
                                </h4>
                                <div className="space-y-2">
                                    {debtsToMe.map(debt => {
                                        const debtor = balances.find(b => b.userId === debt.from);
                                        return (
                                            <div key={debt.from} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center text-emerald-700 font-medium">
                                                        {debtor?.profile?.name?.charAt(0).toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground">{debtor?.profile?.name}</p>
                                                        <p className="text-sm text-emerald-600">owes you</p>
                                                    </div>
                                                </div>
                                                <p className="text-xl font-bold text-emerald-600">
                                                    ${debt.amount.toFixed(2)}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* People you owe */}
                        {myDebts.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center">
                                    <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                                    People you owe
                                </h4>
                                <div className="space-y-2">
                                    {myDebts.map(debt => {
                                        const creditor = balances.find(b => b.userId === debt.to);
                                        return (
                                            <div key={debt.to} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center text-orange-700 font-medium">
                                                        {creditor?.profile?.name?.charAt(0).toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground">{creditor?.profile?.name}</p>
                                                        <p className="text-sm text-orange-600">you owe</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <p className="text-xl font-bold text-orange-600">
                                                        ${debt.amount.toFixed(2)}
                                                    </p>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => onSettleUp(debt)}
                                                        className="border-orange-200 hover:bg-orange-100"
                                                    >
                                                        <ArrowRight className="h-4 w-4 mr-1" />
                                                        Pay
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* All members summary */}
                <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="text-sm font-semibold text-foreground mb-3">All household balances</h4>
                    <div className="space-y-2">
                        {balances.map(balance => {
                            const isCurrentUser = balance.userId === currentUserId;
                            const isSettledUser = Math.abs(balance.balance) < 0.01;
                            
                            return (
                                <div key={balance.userId} className={`flex items-center justify-between p-2 rounded-md ${
                                    isCurrentUser ? 'bg-secondary' : ''
                                }`}>
                                    <span className="text-sm font-medium text-foreground">
                                        {balance.profile?.name} {isCurrentUser && '(You)'}
                                    </span>
                                    {isSettledUser ? (
                                        <span className="text-sm text-secondary-foreground italic">settled up</span>
                                    ) : (
                                        <span className={`text-sm font-medium ${
                                            balance.balance > 0 ? 'text-emerald-600' : 'text-orange-600'
                                        }`}>
                                            {balance.balance > 0 ? '+' : '-'}${Math.abs(balance.balance).toFixed(2)}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};