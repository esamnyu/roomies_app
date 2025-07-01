'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle, DollarSign, Users, Calculator, Receipt } from 'lucide-react';
import { Button } from './primitives/Button';
import { Input } from './primitives/Input';
import { Card, CardContent } from './surfaces/Card';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  paidBy: string;
  splitBetween: string[];
  splitType: 'equal' | 'custom' | 'percentage';
  customSplits?: { [userId: string]: number };
  date: string;
}

interface ExpenseSplitterV3CompactProps {
  householdMembers: Array<{ id: string; name: string; avatar?: string }>;
  currentUserId: string;
  onAddExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  onCancel?: () => void;
  isModal?: boolean; // New prop to control layout
}

type Step = 'details' | 'split' | 'review';

const categories = [
  { id: 'food', label: 'Food', icon: '🍕' },
  { id: 'utilities', label: 'Utilities', icon: '💡' },
  { id: 'rent', label: 'Rent', icon: '🏠' },
  { id: 'supplies', label: 'Supplies', icon: '🧻' },
  { id: 'entertainment', label: 'Fun', icon: '🎮' },
  { id: 'other', label: 'Other', icon: '📦' },
];

export const ExpenseSplitterV3Compact: React.FC<ExpenseSplitterV3CompactProps> = ({
  householdMembers,
  currentUserId,
  onAddExpense,
  onCancel,
  isModal = false,
}) => {
  const [step, setStep] = useState<Step>('details');
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [splitType, setSplitType] = useState<'equal' | 'custom' | 'percentage'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(householdMembers.map(m => m.id));
  const [customSplits, setCustomSplits] = useState<{ [userId: string]: number }>({});
  
  // Calculate splits based on type
  const calculatedSplits = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    
    if (splitType === 'equal') {
      const perPerson = numAmount / selectedMembers.length;
      return selectedMembers.reduce((acc, id) => ({
        ...acc,
        [id]: perPerson,
      }), {});
    }
    
    return customSplits;
  }, [amount, splitType, selectedMembers, customSplits]);
  
  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onAddExpense({
        description,
        amount: parseFloat(amount),
        category,
        paidBy,
        splitBetween: selectedMembers,
        splitType,
        customSplits: splitType !== 'equal' ? customSplits : undefined,
        date: new Date().toISOString(),
      });
      toast.success('Expense added successfully!');
      onCancel?.();
    } catch (error) {
      toast.error('Failed to add expense');
    } finally {
      setLoading(false);
    }
  };
  
  const canProceed = () => {
    switch (step) {
      case 'details':
        return description && amount && parseFloat(amount) > 0 && category;
      case 'split':
        return selectedMembers.length > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  };
  
  const containerClass = isModal 
    ? "bg-white rounded-xl max-w-lg mx-auto" 
    : "min-h-screen bg-secondary-50";
    
  const headerClass = isModal
    ? "sticky top-0 z-10 bg-white border-b border-secondary-200 rounded-t-xl"
    : "sticky top-0 z-sticky bg-white border-b border-secondary-200";
    
  const contentClass = isModal
    ? "px-4 py-4 max-h-[60vh] overflow-y-auto"
    : "px-4 py-6";
    
  const footerClass = isModal
    ? "sticky bottom-0 p-4 bg-white border-t border-secondary-200 rounded-b-xl"
    : "fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-secondary-200";
  
  return (
    <div className={containerClass}>
      {/* Header */}
      <header className={headerClass}>
        <div className="flex items-center justify-between px-4 h-12 md:h-14">
          <button 
            onClick={onCancel}
            className="p-2 -ml-2 rounded-lg hover:bg-secondary-100 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-base md:text-lg">Add Expense</h1>
          <button
            onClick={() => {
              if (step === 'review') handleSubmit();
              else if (step === 'details') setStep('split');
              else if (step === 'split') setStep('review');
            }}
            disabled={!canProceed() || loading}
            className="text-primary-500 font-medium disabled:opacity-50 text-sm md:text-base"
          >
            {step === 'review' ? 'Save' : 'Next'}
          </button>
        </div>
        
        {/* Progress indicator */}
        <div className="flex gap-1.5 px-4 pb-2">
          {(['details', 'split', 'review'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                step === s || i < ['details', 'split', 'review'].indexOf(step)
                  ? 'bg-primary-500'
                  : 'bg-secondary-200'
              )}
            />
          ))}
        </div>
      </header>
      
      {/* Animated step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={contentClass}
        >
          {step === 'details' && (
            <ExpenseDetailsStep
              description={description}
              setDescription={setDescription}
              amount={amount}
              setAmount={setAmount}
              category={category}
              setCategory={setCategory}
              paidBy={paidBy}
              setPaidBy={setPaidBy}
              householdMembers={householdMembers}
              compact={isModal}
            />
          )}
          
          {step === 'split' && (
            <ExpenseSplitStep
              amount={parseFloat(amount) || 0}
              splitType={splitType}
              setSplitType={setSplitType}
              selectedMembers={selectedMembers}
              setSelectedMembers={setSelectedMembers}
              customSplits={customSplits}
              setCustomSplits={setCustomSplits}
              householdMembers={householdMembers}
              compact={isModal}
            />
          )}
          
          {step === 'review' && (
            <ExpenseReviewStep
              description={description}
              amount={parseFloat(amount) || 0}
              category={category}
              paidBy={paidBy}
              calculatedSplits={calculatedSplits}
              householdMembers={householdMembers}
              compact={isModal}
            />
          )}
        </motion.div>
      </AnimatePresence>
      
      {/* Fixed bottom navigation */}
      <div className={footerClass}>
        <div className="flex gap-3">
          {step !== 'details' && (
            <Button
              variant="outline"
              size={isModal ? "md" : "lg"}
              onClick={() => {
                if (step === 'split') setStep('details');
                else if (step === 'review') setStep('split');
              }}
              className="flex-1"
            >
              Back
            </Button>
          )}
          <Button
            size={isModal ? "md" : "lg"}
            onClick={() => {
              if (step === 'review') handleSubmit();
              else if (step === 'details') setStep('split');
              else if (step === 'split') setStep('review');
            }}
            disabled={!canProceed() || loading}
            loading={loading}
            className="flex-1"
          >
            {step === 'review' ? 'Add Expense' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Step Components with compact mode support
interface StepProps {
  householdMembers: Array<{ id: string; name: string; avatar?: string }>;
  compact?: boolean;
}

const ExpenseDetailsStep: React.FC<{
  description: string;
  setDescription: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  paidBy: string;
  setPaidBy: (v: string) => void;
} & StepProps> = ({
  description,
  setDescription,
  amount,
  setAmount,
  category,
  setCategory,
  paidBy,
  setPaidBy,
  householdMembers,
  compact = false,
}) => {
  const spacingClass = compact ? "space-y-4" : "space-y-6";
  const bottomPadding = compact ? "pb-20" : "pb-32";
  
  return (
    <div className={cn(spacingClass, bottomPadding)}>
      <div>
        <label className="text-sm font-medium text-secondary-700 mb-1.5 block">
          What's this expense for?
        </label>
        <Input
          type="text"
          placeholder="e.g., Groceries, Utilities"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          inputSize={compact ? "md" : "lg"}
          className={compact ? "" : "text-lg"}
          autoFocus
        />
      </div>
      
      <div>
        <label className="text-sm font-medium text-secondary-700 mb-1.5 block">
          Amount
        </label>
        <Input
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          leftIcon={<DollarSign className={compact ? "h-4 w-4" : "h-5 w-5"} />}
          inputSize={compact ? "md" : "lg"}
          className={compact ? "text-xl font-semibold" : "text-2xl font-semibold"}
        />
      </div>
      
      <div>
        <label className="text-sm font-medium text-secondary-700 mb-1.5 block">
          Category
        </label>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={cn(
                'p-3 rounded-lg border-2 transition-all',
                category === cat.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-secondary-200 hover:border-secondary-300',
                compact && 'p-2'
              )}
            >
              <div className={compact ? "text-xl mb-0.5" : "text-2xl mb-1"}>{cat.icon}</div>
              <div className={compact ? "text-xs font-medium" : "text-sm font-medium"}>{cat.label}</div>
            </button>
          ))}
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium text-secondary-700 mb-1.5 block">
          Who paid?
        </label>
        <div className="space-y-2">
          {householdMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => setPaidBy(member.id)}
              className={cn(
                'w-full flex items-center p-2.5 rounded-lg border-2 transition-all',
                paidBy === member.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-secondary-200 hover:border-secondary-300',
                compact && 'p-2'
              )}
            >
              <div className={cn(
                "rounded-full bg-secondary-200 flex items-center justify-center mr-3",
                compact ? "w-8 h-8" : "w-10 h-10"
              )}>
                {member.avatar ? (
                  <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full" />
                ) : (
                  <span className={compact ? "text-xs font-medium" : "text-sm font-medium"}>
                    {member.name[0]}
                  </span>
                )}
              </div>
              <span className={compact ? "text-sm font-medium" : "font-medium"}>{member.name}</span>
              {paidBy === member.id && (
                <CheckCircle className={cn("ml-auto text-primary-500", compact ? "h-4 w-4" : "h-5 w-5")} />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const ExpenseSplitStep: React.FC<{
  amount: number;
  splitType: 'equal' | 'custom' | 'percentage';
  setSplitType: (v: 'equal' | 'custom' | 'percentage') => void;
  selectedMembers: string[];
  setSelectedMembers: (v: string[]) => void;
  customSplits: { [userId: string]: number };
  setCustomSplits: (v: { [userId: string]: number }) => void;
} & StepProps> = ({
  amount,
  splitType,
  setSplitType,
  selectedMembers,
  setSelectedMembers,
  customSplits,
  setCustomSplits,
  householdMembers,
  compact = false,
}) => {
  const toggleMember = (memberId: string) => {
    setSelectedMembers(
      selectedMembers.includes(memberId)
        ? selectedMembers.filter(id => id !== memberId)
        : [...selectedMembers, memberId]
    );
  };
  
  const spacingClass = compact ? "space-y-4" : "space-y-6";
  const bottomPadding = compact ? "pb-20" : "pb-32";
  
  return (
    <div className={cn(spacingClass, bottomPadding)}>
      <div>
        <label className="text-sm font-medium text-secondary-700 mb-1.5 block">
          How to split?
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setSplitType('equal')}
            className={cn(
              'p-2.5 rounded-lg border-2 transition-all',
              splitType === 'equal'
                ? 'border-primary-500 bg-primary-50'
                : 'border-secondary-200',
              compact && 'p-2'
            )}
          >
            <Users className={compact ? "h-4 w-4 mx-auto mb-0.5" : "h-5 w-5 mx-auto mb-1"} />
            <div className={compact ? "text-xs font-medium" : "text-sm font-medium"}>Equal</div>
          </button>
          <button
            onClick={() => setSplitType('custom')}
            className={cn(
              'p-2.5 rounded-lg border-2 transition-all',
              splitType === 'custom'
                ? 'border-primary-500 bg-primary-50'
                : 'border-secondary-200',
              compact && 'p-2'
            )}
          >
            <DollarSign className={compact ? "h-4 w-4 mx-auto mb-0.5" : "h-5 w-5 mx-auto mb-1"} />
            <div className={compact ? "text-xs font-medium" : "text-sm font-medium"}>Amount</div>
          </button>
          <button
            onClick={() => setSplitType('percentage')}
            className={cn(
              'p-2.5 rounded-lg border-2 transition-all',
              splitType === 'percentage'
                ? 'border-primary-500 bg-primary-50'
                : 'border-secondary-200',
              compact && 'p-2'
            )}
          >
            <Calculator className={compact ? "h-4 w-4 mx-auto mb-0.5" : "h-5 w-5 mx-auto mb-1"} />
            <div className={compact ? "text-xs font-medium" : "text-sm font-medium"}>Percent</div>
          </button>
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium text-secondary-700 mb-1.5 block">
          Split between
        </label>
        <div className="space-y-2">
          {householdMembers.map((member) => (
            <Card
              key={member.id}
              interactive
              onClick={() => toggleMember(member.id)}
              className={cn(
                'cursor-pointer',
                selectedMembers.includes(member.id)
                  ? 'border-primary-500 bg-primary-50'
                  : ''
              )}
              padding={compact ? "sm" : "md"}
            >
              <CardContent className={cn("flex items-center", compact ? "p-2" : "p-3")}>
                <div className={cn(
                  "rounded-full bg-secondary-200 flex items-center justify-center mr-3",
                  compact ? "w-8 h-8" : "w-10 h-10"
                )}>
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full" />
                  ) : (
                    <span className={compact ? "text-xs font-medium" : "text-sm font-medium"}>
                      {member.name[0]}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className={compact ? "text-sm font-medium" : "font-medium"}>{member.name}</div>
                  {splitType === 'equal' && selectedMembers.includes(member.id) && (
                    <div className={compact ? "text-xs text-secondary-600" : "text-sm text-secondary-600"}>
                      ${(amount / selectedMembers.length).toFixed(2)}
                    </div>
                  )}
                </div>
                {selectedMembers.includes(member.id) && (
                  <CheckCircle className={cn("text-primary-500", compact ? "h-4 w-4" : "h-5 w-5")} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {splitType !== 'equal' && (
        <div className={cn(
          "text-center text-sm text-secondary-600 p-3 bg-warning-50 rounded-lg",
          compact && "text-xs p-2"
        )}>
          Custom split options coming soon!
        </div>
      )}
    </div>
  );
};

const ExpenseReviewStep: React.FC<{
  description: string;
  amount: number;
  category: string;
  paidBy: string;
  calculatedSplits: { [userId: string]: number };
} & StepProps> = ({
  description,
  amount,
  category,
  paidBy,
  calculatedSplits,
  householdMembers,
  compact = false,
}) => {
  const payer = householdMembers.find(m => m.id === paidBy);
  const categoryInfo = categories.find(c => c.id === category);
  
  const spacingClass = compact ? "space-y-4" : "space-y-6";
  const bottomPadding = compact ? "pb-20" : "pb-32";
  
  return (
    <div className={cn(spacingClass, bottomPadding)}>
      <Card>
        <CardContent className={compact ? "p-4" : "p-6"}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={compact ? "text-base font-semibold" : "text-lg font-semibold"}>{description}</h3>
            <span className={cn(
              "font-bold text-primary-600",
              compact ? "text-xl" : "text-2xl"
            )}>
              ${amount.toFixed(2)}
            </span>
          </div>
          
          <div className={cn("space-y-2", compact ? "text-xs" : "text-sm")}>
            <div className="flex items-center justify-between">
              <span className="text-secondary-600">Category</span>
              <span className="font-medium flex items-center">
                {categoryInfo?.icon} {categoryInfo?.label}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary-600">Paid by</span>
              <span className="font-medium">{payer?.name}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div>
        <h4 className={cn(
          "font-medium text-secondary-700 mb-2",
          compact ? "text-xs" : "text-sm"
        )}>Split breakdown</h4>
        <Card>
          <CardContent className="p-0">
            {Object.entries(calculatedSplits).map(([userId, amount], index) => {
              const member = householdMembers.find(m => m.id === userId);
              const isLast = index === Object.entries(calculatedSplits).length - 1;
              
              return (
                <div
                  key={userId}
                  className={cn(
                    'flex items-center justify-between',
                    compact ? 'p-3' : 'p-4',
                    !isLast && 'border-b border-secondary-100'
                  )}
                >
                  <div className="flex items-center">
                    <div className={cn(
                      "rounded-full bg-secondary-200 flex items-center justify-center mr-2",
                      compact ? "w-6 h-6" : "w-8 h-8"
                    )}>
                      {member?.avatar ? (
                        <img src={member.avatar} alt={member.name} className="w-full h-full rounded-full" />
                      ) : (
                        <span className={compact ? "text-[10px] font-medium" : "text-xs font-medium"}>
                          {member?.name[0]}
                        </span>
                      )}
                    </div>
                    <span className={compact ? "text-sm font-medium" : "font-medium"}>{member?.name}</span>
                  </div>
                  <span className={compact ? "text-sm font-semibold" : "font-semibold"}>
                    ${amount.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
      
      {!compact && (
        <div className="flex items-center justify-center p-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <div className="w-20 h-20 rounded-full bg-success-light flex items-center justify-center">
              <Receipt className="h-10 w-10 text-white" />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};