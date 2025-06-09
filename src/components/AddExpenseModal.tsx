// src/components/AddExpenseModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import * as api from '@/lib/api';
import { toast } from 'react-hot-toast';
import type { HouseholdMember } from '@/lib/api';
import { useAuth } from './AuthProvider';

interface AddExpenseModalProps {
  householdId: string;
  members: HouseholdMember[];
  onClose: () => void;
  onExpenseAdded: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ householdId, members, onClose, onExpenseAdded }) => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [splitType, setSplitType] = useState<'equal' | 'custom' | 'percentage'>('equal');
  const [includedMembers, setIncludedMembers] = useState<Set<string>>(new Set(members.map(m => m.user_id)));
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  const [percentageSplits, setPercentageSplits] = useState<Record<string, number>>({});

  useEffect(() => {
    if (splitType === 'equal' && amount) {
      const included = Array.from(includedMembers);
      const splitAmount = included.length > 0 ? parseFloat(amount) / included.length : 0;
      const newSplits: Record<string, number> = {};
      included.forEach(userId => { newSplits[userId] = Math.round(splitAmount * 100) / 100; });
      setCustomSplits(newSplits);
    }
  }, [amount, includedMembers, splitType]);

  useEffect(() => {
    if (splitType === 'percentage') {
      const included = Array.from(includedMembers);
      const equalPercentage = included.length > 0 ? 100 / included.length : 0;
      const newPercentages: Record<string, number> = {};
      included.forEach(userId => { newPercentages[userId] = Math.round(equalPercentage * 100) / 100; });
      setPercentageSplits(newPercentages);
    }
  }, [includedMembers, splitType]);

  const toggleMemberInclusion = (userId: string) => {
    const newIncluded = new Set(includedMembers);
    if (newIncluded.has(userId)) { if (newIncluded.size > 1) newIncluded.delete(userId); }
    else newIncluded.add(userId);
    setIncludedMembers(newIncluded);
  };

  const updateCustomSplit = (userId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setCustomSplits(prev => ({ ...prev, [userId]: Math.round(numValue * 100) / 100 }));
  };

  const updatePercentageSplit = (userId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setPercentageSplits(prev => ({ ...prev, [userId]: Math.min(100, Math.max(0, numValue)) }));
  };

  const calculateSplitsFromPercentages = () => {
    const total = parseFloat(amount) || 0;
    const splits: Record<string, number> = {};
    Array.from(includedMembers).forEach(userId => {
      const percentage = percentageSplits[userId] || 0;
      splits[userId] = Math.round((total * percentage / 100) * 100) / 100;
    });
    return splits;
  };

  const getTotalSplit = () => {
    if (splitType === 'custom') return Object.values(customSplits).reduce((sum, val) => sum + val, 0);
    if (splitType === 'percentage') return Object.values(calculateSplitsFromPercentages()).reduce((sum, val) => sum + val, 0);
    return parseFloat(amount) || 0;
  };

  const getTotalPercentage = () => Array.from(includedMembers).reduce((sum, userId) => sum + (percentageSplits[userId] || 0), 0);

  const isValidSplit = () => {
    const total = parseFloat(amount) || 0;
    if (total <= 0) return false;
    if (includedMembers.size === 0) return false;
    if (splitType === 'custom') return Math.abs(getTotalSplit() - total) < 0.015 * includedMembers.size; // Allow small rounding diff
    if (splitType === 'percentage') return Math.abs(getTotalPercentage() - 100) < 0.015 * includedMembers.size; // Allow small rounding diff
    return true;
  };

  const handleSubmit = async () => {
    if (!description || !amount || !isValidSplit() || !householdId) return;
    setSubmitting(true);
    try {
      let splitsArray: Array<{ user_id: string; amount: number }>;
      if (splitType === 'equal') {
        const included = Array.from(includedMembers);
        const splitAmount = parseFloat(amount) / included.length;
        splitsArray = included.map(userId => ({ user_id: userId, amount: Math.round(splitAmount * 100) / 100 }));
      } else if (splitType === 'custom') {
        splitsArray = Array.from(includedMembers).map(userId => ({ user_id: userId, amount: customSplits[userId] || 0 }));
      } else { // percentage
        const calculatedSplits = calculateSplitsFromPercentages();
        splitsArray = Array.from(includedMembers).map(userId => ({ user_id: userId, amount: calculatedSplits[userId] || 0 }));
      }
      // Ensure final sum matches total amount due to rounding for equal/percentage
      if (splitType !== 'custom') {
          const currentTotal = splitsArray.reduce((sum, s) => sum + s.amount, 0);
          const diff = parseFloat(amount) - currentTotal;
          if (Math.abs(diff) > 0 && splitsArray.length > 0) {
              splitsArray[0].amount += diff; // Add difference to the first person
              splitsArray[0].amount = Math.round(splitsArray[0].amount * 100) / 100;
          }
      }

      await api.createExpenseWithCustomSplits(householdId, description, parseFloat(amount), splitsArray);
      onExpenseAdded();
      onClose();
      toast.success('Expense added!');
    } catch (error) { console.error('Error creating expense:', error); toast.error((error as Error).message || 'Failed to create expense'); }
    finally { setSubmitting(false); }
  };

  const autoBalance = () => {
      const total = parseFloat(amount) || 0;
      const included = Array.from(includedMembers);
      if (included.length === 0) return;
  
      if (splitType === 'custom') {
          const currentTotalSplits = Object.values(customSplits).reduce((sum, val) => sum + (included.includes(Object.keys(customSplits).find(k => customSplits[k] === val)!) ? val : 0), 0);
          const difference = total - currentTotalSplits;
          const adjustmentPerMember = difference / included.length;
          const newSplits = { ...customSplits };
          included.forEach(userId => {
              newSplits[userId] = Math.round(((newSplits[userId] || 0) + adjustmentPerMember) * 100) / 100;
          });
          setCustomSplits(newSplits);
      } else if (splitType === 'percentage') {
          const currentTotalPercentage = getTotalPercentage();
          const difference = 100 - currentTotalPercentage;
          const adjustmentPerMember = difference / included.length;
          const newPercentages = { ...percentageSplits };
          included.forEach(userId => {
              newPercentages[userId] = Math.round(((newPercentages[userId] || 0) + adjustmentPerMember) * 100) / 100;
              if (newPercentages[userId] < 0) newPercentages[userId] = 0; // Don't allow negative percentages
          });
           // Final check to ensure it sums to 100 due to rounding
          const finalSum = Object.values(newPercentages).reduce((sum, val) => sum + val, 0);
          if (finalSum !== 100 && included.length > 0) {
              newPercentages[included[0]] = Math.round((newPercentages[included[0]] + (100 - finalSum)) * 100) / 100;
          }
          setPercentageSplits(newPercentages);
      }
  };

  return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Expense</h3>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700">Description</label><input type="text" className="mt-1 w-full input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this expense for?" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Total Amount</label><div className="mt-1 relative rounded-md shadow-sm"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-gray-500 sm:text-sm">$</span></div><input type="number" step="0.01" className="w-full pl-7 pr-3 py-2 input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></div></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">How to split?</label><div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => setSplitType('equal')} className={`btn ${splitType === 'equal' ? 'btn-primary' : 'btn-secondary-outline'}`}>Equal</button>
              <button type="button" onClick={() => setSplitType('custom')} className={`btn ${splitType === 'custom' ? 'btn-primary' : 'btn-secondary-outline'}`}>Custom</button>
              <button type="button" onClick={() => setSplitType('percentage')} className={`btn ${splitType === 'percentage' ? 'btn-primary' : 'btn-secondary-outline'}`}>Percent</button>
            </div></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Split between ({includedMembers.size} {includedMembers.size === 1 ? 'person' : 'people'})</label><div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3">
              {members.map(member => {
                const isIncluded = includedMembers.has(member.user_id);
                const splitAmount = splitType === 'custom' ? customSplits[member.user_id] || 0 : splitType === 'percentage' ? (calculateSplitsFromPercentages()[member.user_id] || 0) : isIncluded && includedMembers.size > 0 ? (parseFloat(amount) || 0) / includedMembers.size : 0;
                return (<div key={member.user_id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center flex-1"><input type="checkbox" checked={isIncluded} onChange={() => toggleMemberInclusion(member.user_id)} className="h-4 w-4 checkbox" /><label className="ml-2 text-sm font-medium text-gray-700">{member.profiles?.name}{member.user_id === user?.id && ' (You)'}</label></div>
                  <div className="flex items-center space-x-2">
                    {splitType === 'custom' && isIncluded && (<div className="flex items-center"><span className="text-gray-500 mr-1">$</span><input type="number" step="0.01" className="w-20 input-sm" value={customSplits[member.user_id] || ''} onChange={(e) => updateCustomSplit(member.user_id, e.target.value)} disabled={!isIncluded} /></div>)}
                    {splitType === 'percentage' && isIncluded && (<div className="flex items-center"><input type="number" step="0.01" min="0" max="100" className="w-16 input-sm" value={percentageSplits[member.user_id] || ''} onChange={(e) => updatePercentageSplit(member.user_id, e.target.value)} disabled={!isIncluded} /><span className="text-gray-500 ml-1">%</span></div>)}
                    <span className={`text-sm font-medium ${isIncluded ? 'text-gray-900' : 'text-gray-400'}`}>${splitAmount.toFixed(2)}</span>
                  </div></div>);})}</div>
              {(splitType === 'custom' || splitType === 'percentage') && Math.abs(getTotalSplit() - (parseFloat(amount) || 0)) >= 0.01 && (
                  <div className="mt-2 flex items-center justify-between">
                      <span className={`text-sm ${isValidSplit() ? (splitType === 'percentage' ? 'text-green-600' : 'text-orange-600') : 'text-red-600'}`}>
                      {splitType === 'custom' ? `Current Total: $${getTotalSplit().toFixed(2)} / $${parseFloat(amount || '0').toFixed(2)}` : `Current Total: ${getTotalPercentage().toFixed(2)}% / 100%`}
                      </span>
                      <button type="button" onClick={autoBalance} className="text-sm text-blue-600 hover:text-blue-500">Auto-balance {splitType}</button>
                  </div>
              )}
            </div></div>
          <div className="mt-6 flex justify-end space-x-3">
            <button onClick={onClose} className="btn-secondary" disabled={submitting}>Cancel</button>
            <button onClick={handleSubmit} disabled={submitting || !description || !amount || !isValidSplit()} className="btn-primary">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Expense'}
            </button>
          </div></div></div>);
};