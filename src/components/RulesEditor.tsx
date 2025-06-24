'use client';

import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api';
import { HouseRule, Household } from '@/lib/types/types';
import toast from 'react-hot-toast';
// FIX: Corrected import casing to match project convention
import { Button } from './ui/Button'; 
import { Input } from './ui/Input';   
import { Loader2, Trash2 } from 'lucide-react';

interface RulesEditorProps {
  householdId: string;
}

// A new component to manage a single rule
const RuleItem = ({
  rule,
  onUpdate,
  onDelete,
  isProcessing,
}: {
  rule: HouseRule;
  onUpdate: (ruleId: string, category: string, content: string) => void;
  onDelete: (ruleId: string) => void;
  isProcessing: boolean;
}) => {
  const [category, setCategory] = useState(rule.category);
  const [content, setContent] = useState(rule.content);
  const [isEditing, setIsEditing] = useState(false);

  // Update local state if the parent rule prop changes
  useEffect(() => {
    setCategory(rule.category);
    setContent(rule.content);
  }, [rule]);

  const handleUpdate = () => {
    onUpdate(rule.id, category, content);
    setIsEditing(false); // Hide input fields after update
  };
  
  // Reset fields if user cancels edit
  const handleCancel = () => {
      setCategory(rule.category);
      setContent(rule.content);
      setIsEditing(false);
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
        <div className="flex justify-between items-start">
            <div>
                <p className="font-bold text-sm text-muted-foreground">{isEditing ? 'Category' : rule.category}</p>
                {isEditing ? (
                    <Input
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="text-lg font-semibold"
                        disabled={isProcessing}
                    />
                ) : (
                    <p className="font-semibold">{rule.content}</p>
                )}
            </div>
            {!isEditing && (
                 <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
            )}
        </div>

      {isEditing && (
        <div className='space-y-3'>
            <label className='text-sm font-bold text-muted-foreground'>Content</label>
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isProcessing}
            />
            <div className="flex justify-end items-center gap-2 pt-2">
                <Button variant="ghost" onClick={handleCancel} disabled={isProcessing}>Cancel</Button>
                <Button onClick={handleUpdate} disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update
                </Button>
                <Button variant="destructive" size="icon" onClick={() => onDelete(rule.id)} disabled={isProcessing}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
      )}
    </div>
  );
};


export const RulesEditor: React.FC<RulesEditorProps> = ({ householdId }) => {
  const [rules, setRules] = useState<HouseRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // State for the "Add New Rule" form
  const [newRuleCategory, setNewRuleCategory] = useState('');
  const [newRuleContent, setNewRuleContent] = useState('');

  const fetchHouseholdRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getHouseholdDetails(householdId);
      // Safely handle null case and set rules from the correct property
      if (data && data.rules) {
        setRules(data.rules);
      } else {
        setRules([]);
      }
    } catch (error) {
      toast.error('Failed to load household rules.');
      setRules([]); // Ensure rules is an array on error
    } finally {
      setIsLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    fetchHouseholdRules();
  }, [fetchHouseholdRules]);

  const handleAddRule = async () => {
      if (!newRuleCategory.trim() || !newRuleContent.trim()) {
          toast.error("Please provide both a category and content for the new rule.");
          return;
      }
      setIsProcessing(true);
      try {
          const updatedHousehold = await api.addHouseRule(householdId, newRuleCategory, newRuleContent);
          setRules(updatedHousehold.rules || []);
          setNewRuleCategory('');
          setNewRuleContent('');
          toast.success('Rule added successfully!');
      } catch (error) {
          toast.error((error as Error).message || "Failed to add rule.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleUpdateRule = async (ruleId: string, category: string, content: string) => {
    setIsProcessing(true);
    try {
        const updatedHousehold = await api.updateHouseRule(householdId, { id: ruleId, category, content });
        setRules(updatedHousehold.rules || []);
        toast.success('Rule updated successfully!');
    } catch (error) {
        toast.error((error as Error).message || "Failed to update rule.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
      setIsProcessing(true);
      try {
          const updatedHousehold = await api.deleteHouseRule(householdId, ruleId);
          setRules(updatedHousehold.rules || []);
          toast.success('Rule deleted successfully!');
      } catch (error) {
          toast.error((error as Error).message || "Failed to delete rule.");
      } finally {
          setIsProcessing(false);
      }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Household Rules</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Manage the rules for your household.
        </p>
        <div className="space-y-4">
            {rules.map((rule) => (
                <RuleItem 
                    key={rule.id}
                    rule={rule}
                    onUpdate={handleUpdateRule}
                    onDelete={handleDeleteRule}
                    isProcessing={isProcessing}
                />
            ))}
        </div>
      </div>
        
      {/* Add New Rule Form */}
      <div className="border-t pt-6 space-y-3">
          <h4 className='font-semibold'>Add a New Rule</h4>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <Input 
                placeholder="Category (e.g., Guests)"
                value={newRuleCategory}
                onChange={(e) => setNewRuleCategory(e.target.value)}
                disabled={isProcessing}
              />
              <Input 
                placeholder="Content (e.g., Overnight guests require 24-hour notice.)"
                value={newRuleContent}
                onChange={(e) => setNewRuleContent(e.target.value)}
                className="md:col-span-2"
                disabled={isProcessing}
              />
          </div>
          <div className='flex justify-end'>
              <Button onClick={handleAddRule} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Add Rule"}
              </Button>
          </div>
      </div>
    </div>
  );
};