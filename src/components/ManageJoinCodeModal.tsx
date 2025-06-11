// src/components/ManageJoinCodeModal.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, KeyRound } from 'lucide-react';
import * as api from '@/lib/api';
import { toast } from 'react-hot-toast';

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
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Household Join Code</h3>
        {isLoading && !code && <Loader2 className="h-8 w-8 animate-spin text-gray-500 mx-auto my-4" />}
        {error && <p className="text-red-500 text-sm my-2">{error}</p>}
        {code && !error && (
          <div className="my-4">
            <p className="text-gray-700 mb-2">Share this code with new members:</p>
            <p className="text-3xl font-bold tracking-widest bg-gray-100 p-3 rounded-md text-blue-600 inline-block">
              {code}
            </p>
            <button 
              onClick={() => { if(code) { navigator.clipboard.writeText(code); toast.success("Code copied!");} }}
              className="ml-3 text-sm text-blue-500 hover:underline"
            >
              Copy
            </button>
          </div>
        )}
         <p className="text-xs text-gray-500 mb-4">This code allows anyone to join your household if it's not full. Regenerate the code to invalidate the old one.</p>
        <div className="mt-6 flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3">
          <button
            onClick={handleGenerateCode}
            disabled={isLoading}
            className="btn-secondary flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
            {code ? 'Regenerate Code' : 'Generate Code'}
          </button>
          <button
            onClick={onClose}
            className="btn-primary flex items-center justify-center"
            disabled={isLoading}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};