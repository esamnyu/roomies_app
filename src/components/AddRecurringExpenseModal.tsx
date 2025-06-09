// src/components/AddRecurringExpenseModal.tsx
"use client";

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import * as api from '@/lib/api';
import { toast } from 'react-hot-toast';
import type { RecurringExpense } from '@/lib/api';

interface AddRecurringExpenseModalProps {
  householdId: string;
  onClose: () => void;
  onExpenseAdded: () => void;
}

export const AddRecurringExpenseModal: React.FC<AddRecurringExpenseModalProps> = ({ householdId, onClose, onExpenseAdded }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'yearly'>('monthly');
    const [dayOfMonth, setDayOfMonth] = useState('1');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
      if (!description || !amount || !householdId) return;
      setSubmitting(true);
      try {
        await api.createRecurringExpense(householdId, description, parseFloat(amount), frequency, new Date(), 
          (frequency === 'monthly' || frequency === 'quarterly' || frequency === 'yearly') ? parseInt(dayOfMonth) : undefined
        );
        onExpenseAdded();
        onClose();
        toast.success('Recurring expense added!');
      } catch (error) { console.error('Error creating recurring expense:', error); toast.error('Failed to create recurring expense'); }
      finally { setSubmitting(false); }
    };

    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Recurring Expense</h3>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700">Description</label><input type="text" placeholder="e.g., Rent" className="mt-1 w-full input" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-gray-700">Amount</label><input type="number" step="0.01" className="mt-1 w-full input" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-gray-700">Frequency</label><select className="mt-1 w-full input" value={frequency} onChange={(e) => setFrequency(e.target.value as any)}><option value="weekly">Weekly</option><option value="biweekly">Bi-weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></div>
            {(frequency === 'monthly' || frequency === 'quarterly' || frequency === 'yearly') && (<div><label className="block text-sm font-medium text-gray-700">Day of Month (1-31)</label><input type="number" min="1" max="31" className="mt-1 w-full input" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} /></div>)}
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button onClick={onClose} className="btn-secondary" disabled={submitting}>Cancel</button>
            <button onClick={handleSubmit} disabled={submitting || !description || !amount} className="btn-primary">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </button>
          </div>
        </div>
      </div>
    );
};