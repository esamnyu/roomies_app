import React, { useEffect, useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { History, DollarSign, FileText } from 'lucide-react';
import { getUserTransactions, type TransactionLog } from '@/lib/api/transactionHistory';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

interface SimpleTransactionHistoryProps {
  householdId: string;
  userId?: string;
  userName?: string;
  trigger?: React.ReactNode; // Custom trigger button
}

export function SimpleTransactionHistory({ 
  householdId, 
  userId, 
  userName,
  trigger 
}: SimpleTransactionHistoryProps) {
  const [open, setOpen] = useState(false);
  const [transactions, setTransactions] = useState<TransactionLog[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTransactions = async () => {
    if (!open) return;
    
    try {
      setLoading(true);
      const data = await getUserTransactions(householdId, userId, 30);
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [open, householdId, userId]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'expense_created':
      case 'expense_updated':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'settlement_created':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      default:
        return <History className="h-4 w-4 text-gray-500" />;
    }
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
          View History
        </Button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">
                {userName ? `${userName}'s Transaction History` : 'Transaction History'}
              </h2>
            </div>

            <div className="h-[400px] overflow-y-auto p-6">
              {loading ? (
                <div className="flex justify-center py-8">
                  <History className="h-6 w-6 animate-pulse text-gray-400" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No transactions yet
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      {getIcon(transaction.transaction_type)}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{transaction.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(transaction.created_at), 'MMM d, yyyy at h:mm a')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {formatCurrency(transaction.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t">
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