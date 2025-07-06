// src/components/ManageJoinCodeModal.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, KeyRound } from 'lucide-react';
import * as api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/primitives/Button';

interface ManageJoinCodeModalProps {
  householdId: string;
  currentCode: string | null | undefined;
  onClose: () => void;
  onCodeRefreshed: (newCode: string) => void;
}

export const ManageJoinCodeModal: React.FC<ManageJoinCodeModalProps> = ({ householdId, currentCode, onClose, onCodeRefreshed }) => {
  const [code, setCode] = useState(currentCode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateCode = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const newCode = await api.generateAndGetHouseholdJoinCode(householdId);
      setCode(newCode);
      onCodeRefreshed(newCode);
      toast.success('New join code generated!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not generate code.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [householdId, onCodeRefreshed]);

  useEffect(() => {
      if (currentCode !== undefined) {
          setCode(currentCode);
          if(!currentCode) {
            handleGenerateCode();
          }
      } else if (householdId) {
          handleGenerateCode();
      }
  }, [householdId, currentCode, handleGenerateCode]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg p-6 max-w-md w-full text-center shadow-xl border border-border">
        <h3 className="text-lg font-medium text-foreground mb-4">Household Join Code</h3>
        {isLoading && !code && <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto my-4" />}
        {error && <p className="text-destructive text-sm my-2">{error}</p>}
        {code && !error && (
          <div className="my-4">
            <p className="text-secondary-foreground mb-2">Share this code with new members:</p>
            <p className="text-3xl font-bold tracking-widest bg-secondary p-3 rounded-md text-primary inline-block">
              {code}
            </p>
            <button
              onClick={() => { if(code) { navigator.clipboard.writeText(code); toast.success("Code copied!");} }}
              className="ml-3 text-sm text-primary hover:underline"
            >
              Copy
            </button>
          </div>
        )}
         <p className="text-xs text-secondary-foreground opacity-70 mb-4">This code allows anyone to join your household if it&apos;s not full. Regenerate the code to invalidate the old one.</p>
        <div className="mt-6 flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3">
          <Button
            onClick={handleGenerateCode}
            disabled={isLoading}
            variant="secondary"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
            {code ? 'Regenerate Code' : 'Generate Code'}
          </Button>
          <Button
            onClick={onClose}
            disabled={isLoading}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};