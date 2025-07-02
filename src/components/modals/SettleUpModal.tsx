// src/components/SettleUpModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { createSettlement } from '@/lib/api/settlements';
import { toast } from 'react-hot-toast';
import type { HouseholdMember, Profile, SettlementSuggestion } from '@/lib/types/types';
import { useAuth } from '../AuthProvider';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';

interface SettleUpModalProps {
  householdId: string;
  members: HouseholdMember[];
  settlementSuggestions: SettlementSuggestion[];
  onClose: () => void;
  onSettlementCreated: () => void;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({ householdId, members, settlementSuggestions, onClose, onSettlementCreated }) => {
    const { user } = useAuth();
    const [selectedSuggestion, setSelectedSuggestion] = useState<SettlementSuggestion | null>(null);
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
      const amount = parseFloat(customAmount);
      
      if (!payeeId || !customAmount || !householdId || !user) {
        toast.error("Please ensure a recipient and amount are set.");
        return;
      }
    
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount greater than 0');
        return;
      }

      const debtToPayee = myDebts.find(d => d.to === payeeId);
      if (debtToPayee && amount > debtToPayee.amount) {
        toast.error(`You cannot pay more than you owe to this person. You owe $${debtToPayee.amount.toFixed(2)}.`);
        return;
      }

      if (amount > 99999999.99) {
        toast.error('The settlement amount is too large. Please enter a value less than 100 million.');
        return;
      }
    
      if (payeeId === user?.id) {
        toast.error('Cannot create a payment to yourself');
        return;
      }
    
      setSubmitting(true);
      try {
        await createSettlement({
            household_id: householdId,
            payer_id: user.id, // The logged-in user is the payer
            payee_id: payeeId,
            amount,
            description,
        });
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
    
    const getProfileForSuggestion = (suggestion: SettlementSuggestion, type: 'from' | 'to') => {
        const userId = type === 'from' ? suggestion.from : suggestion.to;
        return members.find(m => m.user_id === userId)?.profiles;
    };

    const myDebts = settlementSuggestions.filter(s => s.from === user?.id);
    const owedToMe = settlementSuggestions.filter(s => s.to === user?.id);
    
    const selectStyles = "mt-1 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-background rounded-lg p-6 max-w-2xl w-full my-8">
          <h3 className="text-lg font-medium text-foreground mb-4">Settle Up</h3>
          
          {settlementSuggestions.length > 0 && (<div className="mb-6">
              <h4 className="text-sm font-medium text-foreground mb-3">Suggested Settlements</h4>
              {myDebts.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-secondary-foreground opacity-70 mb-2">You owe:</p>
                  <div className="space-y-2">
                    {myDebts.map((suggestion, idx) => { 
                      const toProfile = getProfileForSuggestion(suggestion, 'to');
                      const isSelected = selectedSuggestion === suggestion;
                      return (
                        <button 
                          key={`debt-${idx}`} 
                          onClick={() => setSelectedSuggestion(suggestion)} 
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${isSelected ? 'border-primary bg-primary/10' : 'border-input hover:border-primary/50' }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Pay <strong>{toProfile?.name || 'Unknown User'}</strong></span>
                            <span className="font-medium">${suggestion.amount.toFixed(2)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {owedToMe.length > 0 && (
                <div>
                  <p className="text-xs text-secondary-foreground opacity-70 mb-2">Owed to you:</p>
                  <div className="space-y-2">
                    {owedToMe.map((suggestion, idx) => { 
                      const fromProfile = getProfileForSuggestion(suggestion, 'from'); 
                      return (
                        <div key={`owed-${idx}`} className="w-full text-left p-3 rounded-lg border border-input bg-secondary">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-secondary-foreground"><strong>{fromProfile?.name || 'Unknown User'}</strong> owes you</span>
                            <span className="font-medium text-secondary-foreground">${suggestion.amount.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>)}
            
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Pay to</label>
              <select className={selectStyles} value={payeeId} onChange={(e) => setPayeeId(e.target.value)}>
                <option value="">Select recipient</option>
                {members.filter(member => member.user_id !== user?.id).map(member => (
                  <option key={member.user_id} value={member.user_id}>{member.profiles?.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Amount</label>
              <Input type="number" step="0.01" className="mt-1" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="0.00"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Description (optional)</label>
              <Input type="text" className="mt-1" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Payment for..."/>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            
            <Button onClick={onClose} variant="secondary" disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !payeeId || !customAmount || parseFloat(customAmount) <=0 || myDebts.length === 0}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Payment'}
            </Button>
          </div>
        </div>
      </div>
    );
};