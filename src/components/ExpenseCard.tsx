// src/components/ExpenseCard.tsx
import React from 'react';
import { ChevronDown, ChevronUp, Pencil, Calendar, User, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { formatCurrency, formatDate } from '@/lib/utils/formatting';
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
    
    // Check if any splits are settled
    const hasSettledSplits = expense.expense_splits?.some(split => split.settled) || false;
    const allSplitsSettled = expense.expense_splits?.every(split => split.settled) || false;
    
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
                                <div className="flex items-center space-x-2">
                                    <h4 className="font-semibold text-foreground text-base">{expense.description}</h4>
                                    {hasSettledSplits && (
                                        <div className="relative group">
                                            <Lock className={`h-4 w-4 ${allSplitsSettled ? 'text-gray-500' : 'text-yellow-500'}`} />
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                                                <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                                    {allSplitsSettled ? 'All splits settled' : 'Some splits settled'}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center space-x-3 mt-1 text-sm text-secondary-foreground">
                                    <div className="flex items-center">
                                        <User className="h-3 w-3 mr-1" />
                                        {expense.profiles?.name}
                                    </div>
                                    <div className="flex items-center">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        {formatDate(expense.date)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 ml-4">
                                <div className="text-right">
                                    <p className="text-lg font-bold text-foreground">
                                        {formatCurrency(expense.amount)}
                                    </p>
                                    {userBalance > 0 && (
                                        <p className={`text-xs font-medium ${
                                            userStatus === 'owed' ? 'text-emerald-600' : 'text-orange-600'
                                        }`}>
                                            {userStatus === 'owed' ? 'you get back' : 'you owe'} {formatCurrency(userBalance)}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center space-x-1">
                                    <div className="relative group">
                                        <Button 
                                            variant="ghost" 
                                            size="icon"
                                            className={hasSettledSplits ? 'text-yellow-600 hover:text-yellow-700' : ''}
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                onEdit(); 
                                            }}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        {hasSettledSplits && (
                                            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
                                                <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                                    Editing will create adjustments
                                                </div>
                                            </div>
                                        )}
                                    </div>
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
                                            {formatCurrency(split.amount)}
                                        </span>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-sm text-secondary-foreground">This was a personal expense.</p>
                        )}
                        
                        {/* Show adjustments if any */}
                        {expense.expense_splits?.some(s => s.expense_split_adjustments && s.expense_split_adjustments.length > 0) && (
                            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                                <div className="flex items-center space-x-2 mb-2">
                                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                                    <h6 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                                        Expense Modified After Settlement
                                    </h6>
                                </div>
                                <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">
                                    This expense was edited after some splits were settled. The following adjustments were created:
                                </p>
                                <div className="space-y-1">
                                    {expense.expense_splits.map(split => 
                                        split.expense_split_adjustments?.map(adj => (
                                            <div key={adj.id} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center space-x-2">
                                                    <div className={`w-2 h-2 rounded-full ${
                                                        adj.adjustment_amount > 0 ? 'bg-green-500' : 'bg-red-500'
                                                    }`} />
                                                    <span className="text-yellow-700 dark:text-yellow-300">
                                                        {split.profiles?.name}
                                                    </span>
                                                </div>
                                                <span className={`font-medium ${
                                                    adj.adjustment_amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                                }`}>
                                                    {adj.adjustment_amount > 0 ? '+' : ''}{formatCurrency(adj.adjustment_amount)}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                                    These adjustments have been applied to the balances.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};