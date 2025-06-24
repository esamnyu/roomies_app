'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import * as api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Balance,
  ExpenseWithDetails,
  HouseholdMemberWithProfile,
} from '@/lib/types/types';
import { Button } from '@/components/ui/Button';
import { AddExpenseModal } from '@/components/AddExpenseModal';
import { EditExpenseModal } from '@/components/EditExpenseModal';
import { SettleUpModal } from '@/components/SettleUpModal';
import { Loader2 } from 'lucide-react';

// You would create these components to display the data cleanly
// For now, we'll define them simply here.
const BalancesDisplay = ({ balances }: { balances: Balance[] }) => (
  <div className="mb-6 rounded-lg bg-muted p-4">
    <h3 className="mb-2 text-lg font-semibold">Current Balances</h3>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {balances.map(({ profile, balance }) => (
        <div key={profile.id}>
          <p className="font-medium">{profile.name}</p>
          <p
            className={
              balance >= 0 ? 'text-green-600' : 'text-destructive'
            }
          >
            {balance >= 0 ? 'Owed' : 'Owes'}: ${Math.abs(balance).toFixed(2)}
          </p>
        </div>
      ))}
    </div>
  </div>
);

const ExpenseList = ({
  expenses,
  onEdit,
}: {
  expenses: ExpenseWithDetails[];
  onEdit: (expense: ExpenseWithDetails) => void;
}) => (
  <div>
    <h3 className="mb-2 text-lg font-semibold">Recent Expenses</h3>
    <ul className="space-y-3">
      {expenses.map((exp) => (
        <li
          key={exp.id}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <div>
            <p className="font-medium">{exp.description}</p>
            <p className="text-sm text-muted-foreground">
              Paid by {exp.paid_by_profile.name} on {new Date(exp.date).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">${exp.amount.toFixed(2)}</p>
            <Button variant="link" size="sm" onClick={() => onEdit(exp)}>
              Edit
            </Button>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

export default function ExpensesPage() {
  const params = useParams();
  const householdId = params.id as string;

  const [balances, setBalances] = useState<Balance[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [members, setMembers] = useState<HouseholdMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // State for modals
  const [isAddExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
  const [isEditExpenseModalOpen, setEditExpenseModalOpen] = useState(false);
  const [isSettleUpModalOpen, setSettleUpModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] =
    useState<ExpenseWithDetails | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch balances, expenses, and members in parallel
      const [balancesData, expensesData, membersData] = await Promise.all([
        api.getHouseholdBalances(householdId),
        api.getHouseholdExpenses(householdId),
        api.getHouseholdMembers(householdId),
      ]);
      setBalances(balancesData);
      setExpenses(expensesData);
      setMembers(membersData);
    } catch (error) {
      toast.error('Failed to load financial data.');
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditExpense = (expense: ExpenseWithDetails) => {
    setSelectedExpense(expense);
    setEditExpenseModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-end gap-2">
          <Button onClick={() => setAddExpenseModalOpen(true)}>
            Add Expense
          </Button>
          <Button variant="secondary" onClick={() => setSettleUpModalOpen(true)}>
            Settle Up
          </Button>
        </div>
        <BalancesDisplay balances={balances} />
        <ExpenseList expenses={expenses} onEdit={handleEditExpense} />
      </div>

      {/* Modals */}
      {/* FIX: Pass the 'members' array directly without .map() */}
      <AddExpenseModal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setAddExpenseModalOpen(false)}
        householdId={householdId}
        members={members.map((m) => m.profile)}
        onExpenseAdded={fetchData} 
      />

      {selectedExpense && (
        // FIX: Pass the 'members' array directly without .map()
        <EditExpenseModal
          isOpen={isEditExpenseModalOpen}
          onClose={() => setEditExpenseModalOpen(false)}
          expense={selectedExpense}
          householdId={householdId}
          members={members.map((m) => m.profile)}
          onExpenseUpdated={fetchData}
        />
      )}

      {/* FIX: Use 'isOpen' prop as expected by SettleUpModalProps */}
      <SettleUpModal
        isOpen={isSettleUpModalOpen}
        onClose={() => setSettleUpModalOpen(false)}
        householdId={householdId}
        members={members}
        balances={balances}
        onSettled={fetchData}
      />
    </>
  );
}
