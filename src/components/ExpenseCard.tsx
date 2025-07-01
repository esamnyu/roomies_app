// src/components/ExpenseCard.tsx
import React from 'react';
import { ChevronDown, ChevronUp, Pencil, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Expense } from '@/lib/types/types';

interface ExpenseCardProps {
    expense: Expense;
    currentUserId: string;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onEdit: () => void;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({
    expense,
    currentUserId,
    isExpanded,
    onToggleExpand,
    onEdit
}) => {
    // Calculate what the current user owes or is owed for this expense
    const currentUserSplit = expense.expense_splits?.find(s => s.user_id === currentUserId);
    const paidByCurrentUser = expense.paid_by === currentUserId;
    
    // If current user paid, they're owed the sum of other people's splits
    // If they didn't pay, they owe their split amount
    let userBalance = 0;
    let userStatus = '';
    
    if (paidByCurrentUser) {
        const totalOwed = expense.expense_splits
            ?.filter(s => s.user_id !== currentUserId && !s.settled)
            ?.reduce((sum, s) => sum + s.amount, 0) || 0;
        
        if (totalOwed > 0) {
            userBalance = totalOwed;
            userStatus = 'owed';
        }
    } else if (currentUserSplit && !currentUserSplit.settled) {
        userBalance = currentUserSplit.amount;
        userStatus = 'owes';
    }
    
    return (
        <div className="bg-background rounded-lg shadow-sm border border-border overflow-hidden hover:shadow-md transition-shadow">
            <div 
                className="p-4 cursor-pointer"
                onClick={onToggleExpand}
            >
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <h4 className="font-semibold text-foreground text-base">{expense.description}</h4>
                                <div className="flex items-center space-x-3 mt-1 text-sm text-secondary-foreground">
                                    <div className="flex items-center">
                                        <User className="h-3 w-3 mr-1" />
                                        {expense.profiles?.name}
                                    </div>
                                    <div className="flex items-center">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        {new Date(expense.date + (expense.date.includes('T') ? '' : 'T00:00:00')).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 ml-4">
                                <div className="text-right">
                                    <p className="text-lg font-bold text-foreground">
                                        ${expense.amount.toFixed(2)}
                                    </p>
                                    {userBalance > 0 && (
                                        <p className={`text-xs font-medium ${
                                            userStatus === 'owed' ? 'text-emerald-600' : 'text-orange-600'
                                        }`}>
                                            {userStatus === 'owed' ? 'you get back' : 'you owe'} ${userBalance.toFixed(2)}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center space-x-1">
                                    <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            onEdit(); 
                                        }}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleExpand();
                                        }}
                                    >
                                        {isExpanded ? 
                                            <ChevronUp className="h-4 w-4" /> : 
                                            <ChevronDown className="h-4 w-4" />
                                        }
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Expanded content showing splits */}
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-border bg-secondary/20">
                    <h5 className="text-sm font-semibold text-foreground mt-3 mb-2">Split Details</h5>
                    <div className="space-y-2">
                        {expense.expense_splits && expense.expense_splits.length > 0 ? (
                            expense.expense_splits.map(split => {
                                const isCurrentUser = split.user_id === currentUserId;
                                return (
                                    <div key={split.id} className={`flex items-center justify-between p-2 rounded-md ${
                                        isCurrentUser ? 'bg-secondary' : ''
                                    }`}>
                                        <div className="flex items-center space-x-2">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                                split.settled ? 'bg-primary/20 text-primary' : 
                                                isCurrentUser ? 'bg-secondary-foreground/20 text-secondary-foreground' : 
                                                'bg-secondary text-secondary-foreground'
                                            }`}>
                                                {split.profiles?.name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <span className={`text-sm ${
                                                split.settled ? 'text-secondary-foreground line-through' : 'text-foreground'
                                            }`}>
                                                {split.profiles?.name || 'Unknown User'}
                                                {isCurrentUser && ' (You)'}
                                            </span>
                                            {split.settled && (
                                                <span className="text-xs text-primary font-medium">Settled</span>
                                            )}
                                        </div>
                                        <span className={`text-sm font-medium ${
                                            split.settled ? 'text-secondary-foreground' : 'text-foreground'
                                        }`}>
                                            ${split.amount.toFixed(2)}
                                        </span>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-sm text-secondary-foreground">This was a personal expense.</p>
                        )}
                        
                        {/* Show adjustments if any */}
                        {expense.expense_splits?.some(s => s.expense_split_adjustments && s.expense_split_adjustments.length > 0) && (
                            <div className="mt-3 pt-3 border-t border-border">
                                <h6 className="text-xs font-semibold text-secondary-foreground mb-2">Adjustments</h6>
                                {expense.expense_splits.map(split => 
                                    split.expense_split_adjustments?.map(adj => (
                                        <div key={adj.id} className="text-xs text-secondary-foreground italic ml-4">
                                            {adj.adjustment_amount > 0 ? '+' : ''}${adj.adjustment_amount.toFixed(2)} 
                                            for {split.profiles?.name} 
                                            {adj.reason && ` - ${adj.reason}`}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};