// src/components/SettleUpModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import * as api from '@/lib/api';
import { toast } from 'react-hot-toast';
import type { HouseholdMember, Profile } from '@/lib/api';
import { useAuth } from './AuthProvider';

interface SettleUpModalProps {
  householdId: string;
  members: HouseholdMember[];
  settlementSuggestions: Array<{ from: string; to: string; amount: number; fromProfile: Profile; toProfile: Profile }>;
  onClose: () => void;
  onSettlementCreated: () => void;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({ householdId, members, settlementSuggestions, onClose, onSettlementCreated }) => {
    const { user } = useAuth();
    const [selectedSuggestion, setSelectedSuggestion] = useState<typeof settlementSuggestions[0] | null>(null);
    const [customAmount, setCustomAmount] = useState('');
    const [payeeId, setPayeeId] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
      if (selectedSuggestion) {
        setPayeeId(selectedSuggestion.to);
        setCustomAmount(selectedSuggestion.amount.toString());
        const toProfile = members.find(m => m.user_id === selectedSuggestion.to)?.profiles;
        setDescription(`Payment to ${toProfile?.name || 'member'}`);
      }
    }, [selectedSuggestion, members]);

    const handleSubmit = async () => {
      if (!payeeId || !customAmount || !householdId) return;
    
      const amount = parseFloat(customAmount);

      if (amount > 99999999.99) {
        toast.error('The settlement amount is too large. Please enter a value less than 100 million.');
        return;
      }

      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount greater than 0');
        return;
      }
    
      if (payeeId === user?.id) {
        toast.error('Cannot create a payment to yourself');
        return;
      }
    
      setSubmitting(true);
      try {
        await api.createSettlement(householdId, payeeId, amount, description);
        onSettlementCreated();
        onClose();
        toast.success('Settlement recorded!');
      } catch (error) {
        console.error('Error creating settlement:', error);
        toast.error((error as Error).message || 'Failed to record settlement');
      } finally {
        setSubmitting(false);
      }
    };
    
    const getProfileForSuggestion = (suggestion: typeof settlementSuggestions[0], type: 'from' | 'to') => {
        const userId = type === 'from' ? suggestion.from : suggestion.to;
        return members.find(m => m.user_id === userId)?.profiles;
    };

    const myDebts = settlementSuggestions.filter(s => s.from === user?.id);
    const owedToMe = settlementSuggestions.filter(s => s.to === user?.id);

    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Settle Up</h3>
          {settlementSuggestions.length > 0 && (<div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Suggested Settlements</h4>
              {myDebts.length > 0 && (<div className="mb-4"><p className="text-xs text-gray-500 mb-2">You owe:</p><div className="space-y-2">{myDebts.map((suggestion, idx) => { const toProfile = getProfileForSuggestion(suggestion, 'to'); return (<button key={`debt-${idx}`} onClick={() => setSelectedSuggestion(suggestion)} className={`w-full text-left p-3 rounded-lg border ${selectedSuggestion === suggestion ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300' }`}><div className="flex justify-between items-center"><span className="text-sm">Pay <strong>{toProfile?.name || 'Unknown User'}</strong></span><span className="font-medium">${suggestion.amount.toFixed(2)}</span></div></button>);})}</div></div>)}
              {owedToMe.length > 0 && (<div><p className="text-xs text-gray-500 mb-2">Owed to you:</p><div className="space-y-2">{owedToMe.map((suggestion, idx) => { const fromProfile = getProfileForSuggestion(suggestion, 'from'); return (<div key={`owed-${idx}`} className="w-full text-left p-3 rounded-lg border border-gray-200 bg-gray-50"><div className="flex justify-between items-center"><span className="text-sm text-gray-600"><strong>{fromProfile?.name || 'Unknown User'}</strong> owes you</span><span className="font-medium text-gray-600">${suggestion.amount.toFixed(2)}</span></div></div>);})}</div></div>)}
            </div>)}
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700">Pay to</label><select className="mt-1 w-full input" value={payeeId} onChange={(e) => setPayeeId(e.target.value)}><option value="">Select recipient</option>{members.filter(member => member.user_id !== user?.id).map(member => (<option key={member.user_id} value={member.user_id}>{member.profiles?.name}</option>))}</select></div>
            <div><label className="block text-sm font-medium text-gray-700">Amount</label><input type="number" step="0.01" className="mt-1 w-full input" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="0.00"/></div>
            <div><label className="block text-sm font-medium text-gray-700">Description (optional)</label><input type="text" className="mt-1 w-full input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Payment for..."/></div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button onClick={onClose} className="btn-secondary" disabled={submitting}>Cancel</button>
            <button onClick={handleSubmit} disabled={submitting || !payeeId || !customAmount || parseFloat(customAmount) <=0} className="btn-primary">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Payment'}
            </button>
          </div>
        </div>
      </div>
    );
};