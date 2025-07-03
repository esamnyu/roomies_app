'use client';

import React, { useEffect, useState } from 'react';
import { ExpenseSplitterSingleScreen } from './ExpenseSplitterSingleScreen';
import { Modal } from './surfaces/Modal';
import { Maximize2 } from 'lucide-react';
import { Button } from './primitives/Button';

interface AddExpenseProps {
  householdId: string;
  householdMembers: Array<{ id: string; name: string; avatar?: string }>;
  currentUserId: string;
  onAddExpense: (expense: any) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
  context?: 'dashboard' | 'settlement' | 'chat' | 'expenses';
}

// Custom hook for media query
const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const updateMatch = () => setMatches(media.matches);
    
    // Set initial value
    updateMatch();
    
    // Add listener (modern browsers)
    if (media.addEventListener) {
      media.addEventListener('change', updateMatch);
      return () => media.removeEventListener('change', updateMatch);
    } else {
      // Fallback for older browsers
      media.addListener(updateMatch);
      return () => media.removeListener(updateMatch);
    }
  }, [query]);

  return matches;
};

export const AddExpense: React.FC<AddExpenseProps> = ({
  householdId,
  householdMembers,
  currentUserId,
  onAddExpense,
  onCancel,
  isOpen,
  context = 'dashboard',
}) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [forceFullScreen, setForceFullScreen] = useState(false);
  
  // Simple logic: mobile always full screen, desktop always modal (unless expanded)
  const shouldUseModal = !isMobile && !forceFullScreen;
  
  // Reset force full screen when modal closes
  useEffect(() => {
    if (!isOpen) {
      setForceFullScreen(false);
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  // Mobile or forced full screen - render full screen version
  if (!shouldUseModal) {
    return (
      <div className="fixed inset-0 z-modal bg-white">
        <ExpenseSplitterSingleScreen
          householdId={householdId}
          householdMembers={householdMembers}
          currentUserId={currentUserId}
          onAddExpense={onAddExpense}
          onCancel={onCancel}
          isModal={false}
        />
      </div>
    );
  }
  
  // Desktop quick add - render in modal
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="lg"
      showCloseButton={false}
      className="overflow-visible"
    >
      {/* Pop out button for desktop users */}
      <div className="absolute -top-12 right-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setForceFullScreen(true)}
          className="text-xs text-secondary-600 hover:text-secondary-900"
        >
          <Maximize2 className="h-3 w-3 mr-1" />
          Expand
        </Button>
      </div>
      
      <ExpenseSplitterSingleScreen
        householdId={householdId}
        householdMembers={householdMembers}
        currentUserId={currentUserId}
        onAddExpense={onAddExpense}
        onCancel={onCancel}
        isModal={true}
      />
    </Modal>
  );
};

// Wrapper component for different trigger contexts
interface AddExpenseButtonProps {
  householdId: string;
  householdMembers: Array<{ id: string; name: string; avatar?: string }>;
  currentUserId: string;
  onAddExpense: (expense: any) => Promise<void>;
  context?: 'dashboard' | 'settlement' | 'chat' | 'expenses';
  className?: string;
  children?: React.ReactNode;
}

export const AddExpenseButton: React.FC<AddExpenseButtonProps> = ({
  householdId,
  householdMembers,
  currentUserId,
  onAddExpense,
  context = 'dashboard',
  className,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleAddExpense = async (expense: any) => {
    await onAddExpense(expense);
    setIsOpen(false);
  };
  
  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className={className}
      >
        {children || 'Add Expense'}
      </Button>
      
      <AddExpense
        isOpen={isOpen}
        onCancel={() => setIsOpen(false)}
        householdId={householdId}
        householdMembers={householdMembers}
        currentUserId={currentUserId}
        onAddExpense={handleAddExpense}
        context={context}
      />
    </>
  );
};