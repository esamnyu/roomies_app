'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Users, Calculator, X, Check, AlertCircle } from 'lucide-react';
import { Button } from './primitives/Button';
import { Input } from './primitives/Input';
import { Card, CardContent } from './surfaces/Card';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ExpenseSplitterSingleScreenProps {
  householdId: string;
  householdMembers: Array<{ id: string; name: string; avatar?: string }>;
  currentUserId: string;
  onAddExpense: (expense: any) => Promise<void>;
  onCancel?: () => void;
  isModal?: boolean;
}

const categories = [
  { id: 'food', label: 'Food', icon: '🍕' },
  { id: 'utilities', label: 'Utilities', icon: '💡' },
  { id: 'rent', label: 'Rent', icon: '🏠' },
  { id: 'supplies', label: 'Supplies', icon: '🧻' },
  { id: 'entertainment', label: 'Fun', icon: '🎮' },
  { id: 'other', label: 'Other', icon: '📦' },
];

export const ExpenseSplitterSingleScreen: React.FC<ExpenseSplitterSingleScreenProps> = ({
  householdId,
  householdMembers,
  currentUserId,
  onAddExpense,
  onCancel,
  isModal = false,
}) => {
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [splitType, setSplitType] = useState<'equal' | 'custom' | 'percentage'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(householdMembers.map(m => m.id));
  const [customSplits, setCustomSplits] = useState<{ [userId: string]: number }>({});
  
  // Validation states
  const [touched, setTouched] = useState<Set<string>>(new Set());
  
  // Touch field for validation
  const touchField = (field: string) => {
    setTouched(prev => new Set(prev).add(field));
  };
  
  // Validation
  const errors = useMemo(() => {
    const errs: { [key: string]: string } = {};
    
    if (touched.has('description') && !description.trim()) {
      errs.description = 'Description is required';
    }
    
    if (touched.has('amount')) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        errs.amount = 'Enter a valid amount';
      }
    }
    
    if (touched.has('category') && !category) {
      errs.category = 'Select a category';
    }
    
    if (selectedMembers.length === 0) {
      errs.split = 'Select at least one person';
    }
    
    return errs;
  }, [description, amount, category, selectedMembers, touched]);
  
  const isValid = description.trim() && parseFloat(amount) > 0 && category && selectedMembers.length > 0;
  
  // Calculate splits based on type
  const calculatedSplits = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    
    if (splitType === 'equal' && selectedMembers.length > 0) {
      const perPerson = numAmount / selectedMembers.length;
      return selectedMembers.reduce((acc, id) => ({
        ...acc,
        [id]: perPerson,
      }), {});
    }
    
    return customSplits;
  }, [amount, splitType, selectedMembers, customSplits]);
  
  // Toggle member selection
  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };
  
  // Handle quick split presets
  const handleQuickSplit = (type: 'all' | 'you') => {
    if (type === 'all') {
      setSelectedMembers(householdMembers.map(m => m.id));
    } else {
      setSelectedMembers([currentUserId]);
    }
  };
  
  const handleSubmit = async () => {
    // Touch all fields to show validation
    ['description', 'amount', 'category'].forEach(touchField);
    
    if (!isValid) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    try {
      const expenseAmount = parseFloat(amount);
      
      // Create splits array in API format
      const splits = selectedMembers.map(userId => ({
        user_id: userId,
        amount: calculatedSplits[userId] || expenseAmount / selectedMembers.length
      }));
      
      // Create expense object
      const expense = {
        householdId,
        description,
        amount: expenseAmount,
        splits,
        date: new Date().toISOString().split('T')[0],
        paidById: paidBy,
      };
      
      await onAddExpense(expense);
      toast.success('Expense added successfully!');
      onCancel?.();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    } finally {
      setLoading(false);
    }
  };
  
  // Get member name helper
  const getMemberName = (memberId: string) => {
    const member = householdMembers.find(m => m.id === memberId);
    return member?.name || 'Unknown';
  };
  
  return (
    <div className={cn(
      "flex flex-col h-full",
      isModal ? "max-h-[90vh]" : "min-h-screen"
    )}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-secondary-200 bg-white">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold">Add Expense</h2>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-secondary-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6 pb-20">
          {/* Amount & Description Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary-400" />
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => touchField('amount')}
                  className={cn(
                    "pl-10 text-2xl font-semibold h-14",
                    errors.amount && touched.has('amount') && "border-error-500"
                  )}
                />
              </div>
              {errors.amount && touched.has('amount') && (
                <p className="text-xs text-error-600 mt-1">{errors.amount}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Description
              </label>
              <Input
                type="text"
                placeholder="What's this expense for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => touchField('description')}
                className={cn(
                  errors.description && touched.has('description') && "border-error-500"
                )}
              />
              {errors.description && touched.has('description') && (
                <p className="text-xs text-error-600 mt-1">{errors.description}</p>
              )}
            </div>
          </div>
          
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setCategory(cat.id);
                    touchField('category');
                  }}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all",
                    "flex flex-col items-center gap-1",
                    category === cat.id
                      ? "border-primary-500 bg-primary-50"
                      : "border-secondary-200 hover:border-secondary-300"
                  )}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-xs font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
            {errors.category && touched.has('category') && (
              <p className="text-xs text-error-600 mt-1">{errors.category}</p>
            )}
          </div>
          
          {/* Who Paid */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Who paid?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {householdMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setPaidBy(member.id)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all",
                    "flex items-center gap-2",
                    paidBy === member.id
                      ? "border-primary-500 bg-primary-50"
                      : "border-secondary-200 hover:border-secondary-300"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium">
                    {member.avatar || member.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium truncate">
                    {member.id === currentUserId ? 'You' : member.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Split Between */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-secondary-700">
                Split between
              </label>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleQuickSplit('all')}
                  className="text-xs"
                >
                  Everyone
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleQuickSplit('you')}
                  className="text-xs"
                >
                  Just me
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              {householdMembers.map((member) => {
                const isSelected = selectedMembers.includes(member.id);
                const splitAmount = calculatedSplits[member.id] || 0;
                
                return (
                  <div
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    className={cn(
                      "p-3 rounded-lg border-2 cursor-pointer transition-all",
                      "flex items-center justify-between",
                      isSelected
                        ? "border-primary-500 bg-primary-50"
                        : "border-secondary-200 hover:border-secondary-300"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center",
                        isSelected 
                          ? "bg-primary-500 border-primary-500" 
                          : "border-secondary-300"
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-medium">
                        {member.avatar || member.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">
                        {member.id === currentUserId ? 'You' : member.name}
                      </span>
                    </div>
                    {isSelected && amount && (
                      <span className="text-sm font-semibold text-primary-600">
                        ${splitAmount.toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {errors.split && (
              <p className="text-xs text-error-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.split}
              </p>
            )}
          </div>
          
          {/* Summary Card - Shows when amount is entered */}
          {amount && parseFloat(amount) > 0 && selectedMembers.length > 0 && (
            <Card className="bg-primary-50 border-primary-200">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary-600">Total</span>
                  <span className="font-semibold">${parseFloat(amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary-600">Split equally between</span>
                  <span className="font-medium">{selectedMembers.length} {selectedMembers.length === 1 ? 'person' : 'people'}</span>
                </div>
                <div className="pt-2 border-t border-primary-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Each person pays</span>
                    <span className="font-semibold text-primary-600">
                      ${(parseFloat(amount) / selectedMembers.length).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Fixed Footer */}
      <div className="flex-shrink-0 border-t border-secondary-200 bg-white p-4">
        <div className="flex gap-3">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !isValid}
            className="flex-1"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Calculator className="h-4 w-4" />
              </motion.div>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Add Expense
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};