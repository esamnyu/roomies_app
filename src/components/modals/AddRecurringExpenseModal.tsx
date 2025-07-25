// src/components/AddRecurringExpenseModal.tsx
"use client";

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import * as api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';

interface AddRecurringExpenseModalProps {
  householdId: string;
  onClose: () => void;
  onExpenseAdded: () => void;
}

// Define the frequency type to avoid using 'any'
type FrequencyType = 'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'yearly';

export const AddRecurringExpenseModal: React.FC<AddRecurringExpenseModalProps> = ({ householdId, onClose, onExpenseAdded }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState<FrequencyType>('monthly');
    const [dayOfMonth, setDayOfMonth] = useState('1');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
      if (!description || !amount || !householdId) return;
      setSubmitting(true);
      try {
        await api.createRecurringExpense(householdId, description, parseFloat(amount), frequency, new Date(),
          (frequency === 'monthly' || frequency === 'quarterly' || frequency === 'yearly') ? parseInt(dayOfMonth, 10) : undefined
        );
        onExpenseAdded();
        onClose();
        toast.success('Recurring expense added!');
      } catch (error) {
        console.error('Error creating recurring expense:', error);
        toast.error('Failed to create recurring expense');
      } finally {
        setSubmitting(false);
      }
    };

    const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFrequency(e.target.value as FrequencyType);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-background rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium text-foreground mb-4">Add Recurring Expense</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Description</label>
              <Input type="text" placeholder="e.g., Rent" className="mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Amount</label>
              <Input type="number" step="0.01" className="mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Frequency</label>
              <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={frequency} onChange={handleFrequencyChange}>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            {(frequency === 'monthly' || frequency === 'quarterly' || frequency === 'yearly') && (
              <div>
                <label className="block text-sm font-medium text-foreground">Day of Month (1-31)</label>
                <Input type="number" min="1" max="31" className="mt-1" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <Button onClick={onClose} variant="secondary" disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !description || !amount}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    );
};
