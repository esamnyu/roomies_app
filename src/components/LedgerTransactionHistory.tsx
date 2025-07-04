import React, { useEffect, useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { History, DollarSign, FileText, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { getLedgerHistory, type LedgerEntry } from '@/lib/api/ledgerSystem';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

interface LedgerTransactionHistoryProps {
  householdId: string;
  userId?: string;
  userName?: string;
  currentBalance?: number;
  trigger?: React.ReactNode;
}

export function LedgerTransactionHistory({ 
  householdId, 
  userId, 
  userName,
  currentBalance,
  trigger 
}: LedgerTransactionHistoryProps) {
  const [open, setOpen] = useState(false);
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningBalance, setRunningBalance] = useState<number[]>([]);

  const loadTransactions = async () => {
    if (!open) return;
    
    try {
      setLoading(true);
      const data = await getLedgerHistory(householdId, userId, 50);
      setTransactions(data);
      
      // Calculate running balance
      if (currentBalance !== undefined && data.length > 0) {
        const balances: number[] = [];
        let balance = currentBalance;
        
        // Work backwards from current balance
        for (let i = 0; i < data.length; i++) {
          balances.unshift(balance);
          const entry = data[i];
          // Reverse the transaction to get previous balance
          if (entry.entry_type === 'credit') {
            balance -= entry.amount;
          } else {
            balance += entry.amount;
          }
        }
        
        setRunningBalance(balances);
      }
    } catch (error) {
      console.error('Failed to load ledger history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [open, householdId, userId]);

  const getIcon = (entry: LedgerEntry) => {
    if (entry.transaction_type === 'reversal') {
      return <RefreshCw className="h-4 w-4 text-orange-500" />;
    }
    if (entry.transaction_type === 'settlement') {
      return <DollarSign className="h-4 w-4 text-blue-500" />;
    }
    if (entry.entry_type === 'credit') {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getAmountDisplay = (entry: LedgerEntry) => {
    const amount = formatCurrency(entry.amount);
    if (entry.entry_type === 'credit') {
      return <span className="text-green-600 font-semibold">+{amount}</span>;
    }
    return <span className="text-red-600 font-semibold">-{amount}</span>;
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className="text-xs"
        >
          <History className="h-3 w-3 mr-1" />
          View Full History
        </Button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                {userName ? `${userName}'s Ledger History` : 'Transaction Ledger'}
              </h2>
              {currentBalance !== undefined && (
                <p className="text-sm text-gray-600 mt-1">
                  Current Balance: {' '}
                  <span className={`font-semibold ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(currentBalance))}
                  </span>
                  {currentBalance >= 0 ? ' (owed to you)' : ' (you owe)'}
                </p>
              )}
            </div>

            <div className="h-[500px] overflow-y-auto p-6">
              {loading ? (
                <div className="flex justify-center py-8">
                  <History className="h-6 w-6 animate-pulse text-gray-400" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No transactions in ledger
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((transaction, index) => (
                    <div
                      key={transaction.entry_id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      {getIcon(transaction)}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{transaction.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500 capitalize">
                            {transaction.transaction_type}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div>{getAmountDisplay(transaction)}</div>
                        {runningBalance[index] !== undefined && (
                          <p className="text-xs text-gray-500 mt-1">
                            Balance: {formatCurrency(runningBalance[index])}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <div className="text-xs text-gray-600 mb-3">
                <p className="font-medium mb-1">Understanding the ledger:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li><span className="text-green-600">Credit (+)</span>: Increases your balance (you paid or received settlement)</li>
                  <li><span className="text-red-600">Debit (-)</span>: Decreases your balance (you owe or paid settlement)</li>
                  <li><span className="text-orange-600">Reversals</span>: Corrections from expense updates or deletions</li>
                </ul>
              </div>
              <Button onClick={() => setOpen(false)} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}