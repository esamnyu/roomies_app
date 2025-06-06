// src/components/RoomiesApp.tsx
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Home, Users, DollarSign, CheckSquare, Plus, LogOut, Menu, X, ArrowLeft, Loader2, CreditCard, ArrowRightLeft, Bell, MessageSquare, Settings, ClipboardList, User, Share2, KeyRound } from 'lucide-react';
import * as api from '@/lib/api';
import type { Profile, Household, HouseholdMember, Expense, Task, Settlement, RecurringExpense } from '@/lib/api';
import { AuthProvider, useAuth } from './AuthProvider';
import { NotificationBell } from './NotificationsPanel';
import { Toaster, toast } from 'react-hot-toast';

import { LandingPageContent } from './LandingPageContent';
import { HouseholdSetupForm } from './HouseholdSetupForm';
import { OnboardingChoice } from './OnboardingChoice';
import { HouseholdChat } from './HouseholdChat';
import { Circle, Edit3, Trash2, AlertTriangle } from 'lucide-react'; // Added ClipboardList
import { ChoreDashboard } from './ChoreDashboard'; // Import the new component

// Layout Component
const Layout: React.FC<{ children: React.ReactNode; title?: string; showBack?: boolean; onBack?: () => void }> = ({
  children,
  title = 'Roomies',
  showBack = false,
  onBack
}) => {
  const { profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                {showBack && (
                  <button
                    onClick={onBack}
                    className="mr-3 p-2 rounded-md hover:bg-gray-100"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
              </div>

              <div className="hidden md:flex items-center space-x-4">
                <NotificationBell />
                <span className="text-sm text-gray-600">{profile?.name}</span>
                <button
                  onClick={signOut}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </button>
              </div>

              <div className="flex items-center md:hidden">
                <NotificationBell />
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="ml-2 p-2 rounded-md hover:bg-gray-100"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200">
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{profile?.name}</span>
                </div>
                <button
                  onClick={signOut}
                  className="w-full text-left text-sm text-gray-500 hover:text-gray-700 flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
      <Toaster position="top-right" />
    </>
  );
};

// Loading Component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4 min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
  </div>
);

// Auth Form
const AuthForm: React.FC<{isRegisteringInitially: boolean}> = ({isRegisteringInitially}) => {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(isRegisteringInitially);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);
    try {
      const { error: authError } = isRegistering
        ? await signUp(email, password, name)
        : await signIn(email, password);
      if (authError) {
        setError(authError.message);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
    const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-md w-full space-y-8">
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome to Roomies
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isRegistering ? 'Create your account' : 'Sign in to manage your shared living expenses'}
        </p>
      </div>
      <div className="mt-8 space-y-6">
        <div className="rounded-md shadow-sm -space-y-px">
          {isRegistering && (
            <div>
              <input
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>
          )}
          <div>
            <input
              type="email"
              required
              className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 ${!isRegistering ? 'rounded-t-md' : ''} focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>
          <div>
            <input
              type="password"
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>
        </div>

        {error && (
          <div className="text-red-600 text-sm text-center">{error}</div>
        )}

        <div>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              isRegistering ? 'Create Account' : 'Sign in'
            )}
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm text-blue-600 hover:text-blue-500"
            disabled={isLoading}
          >
            {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};

const JoinHouseholdWithCode: React.FC<{ onJoined: (household: Household) => void, onCancel: () => void }> = ({ onJoined, onCancel }) => {
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (joinCode.length !== 4) {
      setError('Join code must be 4 characters long.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const household = await api.joinHouseholdWithCode(joinCode);
      toast.success(`Successfully joined ${household.name}!`);
      onJoined(household);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join household.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout title="Join Household">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md mt-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Enter Join Code</h2>
        <p className="text-gray-600 mb-4 text-center">Ask a member of the household for the 4-character join code.</p>
        <div className="space-y-4">
          <div>
            <label htmlFor="joinCode" className="block text-sm font-medium text-gray-700">
              4-Character Code
            </label>
            <input
              type="text"
              id="joinCode"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().trim())}
              maxLength={4}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm uppercase tracking-widest text-center"
              placeholder="XYZ1"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            onClick={handleSubmit}
            disabled={isLoading || joinCode.length !== 4}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join Household'}
          </button>
          <button
            onClick={onCancel}
            className="w-full text-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </Layout>
  );
};

const ManageJoinCodeModal: React.FC<{ householdId: string; currentCode: string | null | undefined; onClose: () => void; onCodeRefreshed: (newCode: string) => void }> = ({ householdId, currentCode, onClose, onCodeRefreshed }) => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, onCodeRefreshed]); 
  
  useEffect(() => {
      if (currentCode !== undefined) { // currentCode prop has been passed
          setCode(currentCode);
          if(!currentCode) { // If passed as null/empty, try to generate one
            handleGenerateCode();
          }
      } else if (householdId) { // If no currentCode passed (undefined), fetch/generate one
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

const HouseholdWelcomeDisplay: React.FC<{ householdId: string; householdName?: string; onProceed: () => void }> = ({ householdId, householdName, onProceed }) => {
  const [fetchedHouseholdName, setFetchedHouseholdName] = useState(householdName);
  const [loading, setLoading] = useState(!householdName);

  useEffect(() => {
    if (!householdName && householdId) {
      setLoading(true);
      api.getHouseholdDetails(householdId)
        .then(details => {
          if (details) setFetchedHouseholdName(details.name);
          else toast.error("Could not fetch household details.");
        })
        .catch(() => toast.error("Error fetching household details."))
        .finally(() => setLoading(false));
    }
  }, [householdId, householdName]);

  if (loading) return <LoadingSpinner />;
  
  const nameToShow = fetchedHouseholdName || "your new household";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="max-w-lg w-full bg-white p-8 rounded-xl shadow-2xl text-center">
        <CheckSquare className="mx-auto h-16 w-16 text-green-500 mb-4" />
        <h1 className="text-3xl font-bold text-emerald-700 mb-4">Welcome to {nameToShow}!</h1>
        <p className="text-gray-600 mb-6">
          You've successfully joined the household.
        </p>
        <button
          onClick={onProceed}
          className="mt-8 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-6 rounded-md text-lg font-medium transition duration-150"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

const Dashboard: React.FC<{ setAppState: (state: AppState) => void }> = ({ setAppState }) => {
  const { user, profile } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loadingHouseholds, setLoadingHouseholds] = useState(true);
  const [selectedHousehold, setSelectedHousehold] = useState<string | null>(null);

  const loadHouseholds = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingHouseholds(true);
      const data = await api.getUserHouseholds();
      setHouseholds(data);
    } catch (error) {
      console.error('Error loading households:', error);
      toast.error('Failed to load households.');
    } finally {
      setLoadingHouseholds(false);
    }
  }, [user]);

  useEffect(() => {
    loadHouseholds();
  }, [loadHouseholds]);
  
  if (selectedHousehold) {
    return <HouseholdDetail householdId={selectedHousehold} onBack={() => {setSelectedHousehold(null); loadHouseholds();}} />;
  }

  return (
    <Layout title={profile?.name || "My Roomies Dashboard"}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Your Households</h2>
          <button
            onClick={() => setAppState('householdSetup')}
            className="btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Household
          </button>
        </div>

        {loadingHouseholds ? (
          <LoadingSpinner />
        ) : households.length === 0 ? (
          <div className="text-center py-12 bg-white p-8 rounded-lg shadow">
            <Home className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No households yet.</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new household or joining one with a code.</p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
                <button
                    onClick={() => setAppState('householdSetup')}
                    className="btn-primary"
                >
                    Create New Household
                </button>
                 <button
                    onClick={() => setAppState('joinWithCode')}
                    className="btn-secondary"
                >
                    Join with Code
                </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {households.map((household) => (
              <button
                key={household.id}
                onClick={() => setSelectedHousehold(household.id)}
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left w-full"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{household.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {household.member_count || household.memberCount || '?'} {Number(household.member_count || household.memberCount) === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

// Modify HouseholdDetailTab type
type HouseholdDetailTab = 'money' | 'choresList' | 'structuredChores' | 'communication' | 'rulesSettings'; // Added 'structuredChores', renamed old 'chores' to 'choresList'

const HouseholdDetail: React.FC<{ householdId: string; onBack: () => void }> = ({ householdId, onBack }) => {
  const { user } = useAuth();
  // Default to structuredChores if chores module is primary focus now
  const [activeTab, setActiveTab] = useState<HouseholdDetailTab>('structuredChores'); 
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]); // This is for the old "Tasks" (To-Do list)
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false); // For the old "Tasks"
  const [showManageJoinCode, setShowManageJoinCode] = useState(false);
  const [currentJoinCode, setCurrentJoinCode] = useState<string | null | undefined>(undefined);
  const [showSettleUp, setShowSettleUp] = useState(false);

  const refreshData = useCallback(async (showToast = false) => {
    // ... (refreshData logic largely unchanged, ensure it fetches household details for chore setup)
    if (!householdId) return;
    setLoadingData(true);
    try {
        const data = await api.getHouseholdData(householdId); // This RPC should ideally include household chore settings too
        let fetchedHouseholdDetails = data?.household;
        
        // If getHouseholdData RPC doesn't include all necessary household fields for chores, fetch separately
        if (!fetchedHouseholdDetails?.core_chores || !fetchedHouseholdDetails?.chore_frequency) {
            fetchedHouseholdDetails = await api.getHouseholdDetails(householdId);
        }

        if (fetchedHouseholdDetails) {
          setHousehold(fetchedHouseholdDetails);
          setCurrentJoinCode(fetchedHouseholdDetails?.join_code);
        }
        setMembers(data?.members || await api.getHouseholdMembers(householdId)); // Fallback
        setExpenses(data?.recent_expenses || await api.getHouseholdExpenses(householdId));
        setTasks(data?.tasks || await api.getHouseholdTasks(householdId)); // For old tasks
        setSettlements(data?.recent_settlements || (api.getHouseholdSettlements ? await api.getHouseholdSettlements(householdId) : []));
      
      const recurringData = await api.getHouseholdRecurringExpenses(householdId);
      setRecurringExpenses(recurringData);
      if(showToast) toast.success("Data refreshed!");
    } catch (error) {
      console.error('Error loading household data:', error);
      toast.error('Failed to load household data.');
    } finally {
      setLoadingData(false);
    }
  }, [householdId]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (!householdId) return;
  
    const subscription = api.subscribeToSettlements(householdId, (newSettlement) => {
      setSettlements(prev => {
        // Check if settlement already exists to prevent duplicates
        const exists = prev.some(s => s.id === newSettlement.id);
        if (exists) return prev;
              
        // Add new settlement at the beginning
        const updated = [newSettlement, ...prev];
        // Keep only the most recent 50 settlements
        return updated.slice(0, 50);
      });
  
      // Recalculate balances
      setTimeout(() => refreshData(false), 100);
    });
  
    return () => {
      subscription.unsubscribe();
    };
  }, [householdId, refreshData]);

  useEffect(() => {
    const processAndRefresh = async () => {
      if (!householdId) return;
      try {
        await api.processDueRecurringExpenses(householdId);
        await refreshData(false); // Refresh without toast
      } catch (error) {
        console.error('Error processing recurring expenses:', error);
      }
    };
    if(householdId) processAndRefresh();
  }, [householdId, refreshData]);


  const sendReminder = async (debtorId: string, amount: number) => {
    try {
      await api.sendPaymentReminder(householdId, debtorId, amount);
      toast.success('Reminder sent!');
    } catch (error) { console.error('Error sending reminder:', error); toast.error('Failed to send reminder'); }
  };

  const balances = api.calculateBalances(expenses, members, settlements);
  const settlementSuggestions = api.getSettlementSuggestions ? api.getSettlementSuggestions(balances) : [];

  // AddRecurringExpenseModal (similar to existing, ensure refreshData is called on success)
  const AddRecurringExpenseModal = () => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'yearly'>('monthly');
    const [dayOfMonth, setDayOfMonth] = useState('1');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
      if (!description || !amount || !householdId) return;
      setSubmitting(true);
      try {
        await api.createRecurringExpense(householdId, description, parseFloat(amount), frequency, new Date(), 
          (frequency === 'monthly' || frequency === 'quarterly' || frequency === 'yearly') ? parseInt(dayOfMonth) : undefined
        );
        await refreshData();
        setShowAddRecurring(false);
        toast.success('Recurring expense added!');
      } catch (error) { console.error('Error creating recurring expense:', error); toast.error('Failed to create recurring expense'); }
      finally { setSubmitting(false); }
    };
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Recurring Expense</h3>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700">Description</label><input type="text" placeholder="e.g., Rent" className="mt-1 w-full input" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-gray-700">Amount</label><input type="number" step="0.01" className="mt-1 w-full input" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-gray-700">Frequency</label><select className="mt-1 w-full input" value={frequency} onChange={(e) => setFrequency(e.target.value as any)}><option value="weekly">Weekly</option><option value="biweekly">Bi-weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></div>
            {(frequency === 'monthly' || frequency === 'quarterly' || frequency === 'yearly') && (<div><label className="block text-sm font-medium text-gray-700">Day of Month (1-31)</label><input type="number" min="1" max="31" className="mt-1 w-full input" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} /></div>)}
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button onClick={() => setShowAddRecurring(false)} className="btn-secondary" disabled={submitting}>Cancel</button>
            <button onClick={handleSubmit} disabled={submitting || !description || !amount} className="btn-primary">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  const AddExpenseModal = () => {
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
        await refreshData();
        setShowAddExpense(false);
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
              <button onClick={() => setShowAddExpense(false)} className="btn-secondary" disabled={submitting}>Cancel</button>
              <button onClick={handleSubmit} disabled={submitting || !description || !amount || !isValidSplit()} className="btn-primary">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Expense'}
              </button>
            </div></div></div>);
  };


  // Task Modal (for old tasks system)
  const AddTaskModal = () => {
    const [title, setTitle] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const handleSubmit = async () => {
      if (!title || !householdId) return;
      setSubmitting(true);
      try {
        await api.createTask(householdId, title, assignedTo || undefined); // Uses old createTask
        await refreshData(); // Refresh all data, including tasks
        setShowAddTask(false); toast.success('Task added!');
      } catch (error) { console.error('Error creating task:', error); toast.error((error as Error).message || 'Failed to create task'); }
      finally { setSubmitting(false); }
    };
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Task</h3>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700">Task</label><input type="text" className="mt-1 w-full input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-gray-700">Assign to (optional)</label><select className="mt-1 w-full input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}><option value="">Unassigned</option>{members.map(member => (<option key={member.user_id} value={member.user_id}>{member.profiles?.name}</option>))}</select></div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button onClick={() => setShowAddTask(false)} className="btn-secondary" disabled={submitting}>Cancel</button>
            <button onClick={handleSubmit} disabled={submitting || !title} className="btn-primary">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Task'}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  const SettleUpModal = () => {
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
    
      // Add validation
      const amount = parseFloat(customAmount);

      if (amount > 99999999.99) {
    toast.error('The settlement amount is too large. Please enter a value less than 100 million.');
    return; // Stop the function here
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
        await refreshData();
        setShowSettleUp(false);
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
            <button onClick={() => setShowSettleUp(false)} className="btn-secondary" disabled={submitting}>Cancel</button>
            <button onClick={handleSubmit} disabled={submitting || !payeeId || !customAmount || parseFloat(customAmount) <=0} className="btn-primary">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Payment'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const markExpenseSettled = async (expenseId: string, userIdToSettle: string) => {
    try { await api.markExpenseSettled(expenseId, userIdToSettle); await refreshData(); toast.success('Expense part marked settled!'); }
    catch (error) { console.error('Error marking expense settled:', error); toast.error('Failed to mark expense settled.'); }
  };

  // completeTask (for old tasks system)
  const completeTask = async (taskId: string) => {
    try { await api.completeTask(taskId); await refreshData(); toast.success('Task completed!'); } // Uses old completeTask
    catch (error) { console.error('Error completing task:', error); toast.error('Failed to complete task.'); }
  };

  if (loadingData && !household) return <Layout title="Loading Household..." showBack onBack={onBack}><LoadingSpinner /></Layout>;

  return (
    <Layout title={household?.name || 'Household Details'} showBack onBack={onBack}>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Balance Summary</h3>
            <button onClick={() => setShowSettleUp(true)} className="btn-primary-sm flex items-center">
              <CreditCard className="h-4 w-4 mr-1" />Settle Up
            </button>
          </div>
          <div className="space-y-2">
            {balances.length > 0 ? balances.map(balance => (
              <div key={balance.userId} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{balance.profile?.name}</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${balance.balance > 0 ? 'text-green-600' : balance.balance < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {balance.balance > 0 ? '+' : ''}${Math.abs(balance.balance).toFixed(2)}{balance.balance < 0 && ' owed'}
                  </span>
                  {balance.balance < -0.01 && balance.userId !== user?.id && ( <button onClick={() => sendReminder(balance.userId, Math.abs(balance.balance))} className="text-xs text-blue-600 hover:text-blue-700" title="Send payment reminder"><Bell className="h-3 w-3" /></button> )}
                </div>
              </div>
            )) : <p className="text-sm text-gray-500">No balances to show yet. Add some expenses!</p>}
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
            {(['money', 'structuredChores', 'choresList', 'communication', 'rulesSettings'] as HouseholdDetailTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 sm:px-3 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                {tab === 'money' && <DollarSign className="inline h-4 w-4 mr-1" />}
                {tab === 'structuredChores' && <ClipboardList className="inline h-4 w-4 mr-1" />}
                {tab === 'choresList' && <CheckSquare className="inline h-4 w-4 mr-1" />} 
                {tab === 'communication' && <MessageSquare className="inline h-4 w-4 mr-1" />}
                {tab === 'rulesSettings' && <Settings className="inline h-4 w-4 mr-1" />}
                {tab === 'money' ? 'Money' : 
                 tab === 'structuredChores' ? 'Chores (New)' : 
                 tab === 'choresList' ? 'Tasks (Old)' : 
                 tab === 'communication' ? 'Communication' : 'Rules & Settings'}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'money' && (
           <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-medium text-gray-700">Recurring Expenses</h4>
                <button onClick={() => setShowAddRecurring(true)} className="text-sm text-blue-600 hover:text-blue-500"><Plus className="h-4 w-4 inline mr-1" />Add Recurring</button>
              </div>
              {loadingData && recurringExpenses.length === 0 ? <LoadingSpinner/> : recurringExpenses.length === 0 ? <p className="text-sm text-gray-500">No recurring expenses.</p> : ( <div className="space-y-2">{recurringExpenses.map(rec => (<div key={rec.id} className="flex justify-between items-center text-sm p-2 bg-white rounded shadow-sm"><div><span className="font-medium">{rec.description}</span><span className="text-gray-500 ml-2">${rec.amount.toFixed(2)} {rec.frequency}</span></div><div className="text-gray-500">Next: {new Date(rec.next_due_date + (rec.next_due_date.includes('T') ? '' : 'T00:00:00')).toLocaleDateString()}</div></div>))}</div> )}
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center"><h3 className="text-lg font-medium text-gray-900">One-Time Expenses</h3><button onClick={() => setShowAddExpense(true)} className="btn-primary-sm flex items-center"><Plus className="h-4 w-4 mr-1" />Add Expense</button></div>
              <div className="space-y-3">
                {loadingData && expenses.length === 0 ? <LoadingSpinner/> : expenses.length === 0 ? <p className="text-gray-500 text-center py-4">No one-time expenses.</p> : ( expenses.map(expense => (<div key={expense.id} className="bg-white rounded-lg shadow p-4"><div className="flex justify-between items-start"><div className="flex-1"><h4 className="font-medium text-gray-900">{expense.description}</h4><p className="text-sm text-gray-500">Paid by {expense.profiles?.name} • {new Date(expense.date + (expense.date.includes('T') ? '' : 'T00:00:00')).toLocaleDateString()}</p><div className="mt-2 space-y-1"> {expense.expense_splits?.filter(split => split.user_id !== expense.paid_by && !split.settled).map(split => (<div key={split.id} className="flex items-center justify-between text-sm"><span className="text-gray-600">{split.profiles?.name} owes</span><div className="flex items-center space-x-2"><span className="font-medium">${split.amount.toFixed(2)}</span>{user?.id === expense.paid_by && (<button onClick={() => markExpenseSettled(expense.id, split.user_id)} className="text-xs text-blue-600 hover:text-blue-500" title={`Mark ${split.profiles?.name}'s share as paid`}>Mark paid</button>)}</div></div>))} {expense.expense_splits?.filter(split => split.user_id !== expense.paid_by && split.settled).map(split => (<div key={split.id} className="flex items-center justify-between text-sm"><span className="text-gray-400 line-through">{split.profiles?.name} paid</span><div className="flex items-center space-x-2"><span className="font-medium text-gray-400 line-through">${split.amount.toFixed(2)}</span><CheckSquare className="h-4 w-4 text-green-500" /></div></div>))} </div></div><div className="text-right ml-4"><p className="font-medium text-gray-900">${expense.amount.toFixed(2)}</p>{members.length > 0 && (<p className="text-xs text-gray-500">${(expense.amount / (expense.expense_splits?.length || members.length || 1)).toFixed(2)} each</p>)}</div></div></div>)) )}
              </div>
            </div>
            <div className="space-y-4 pt-6 border-t">
              <div className="flex justify-between items-center"><h3 className="text-lg font-medium text-gray-900">Recent Settlements</h3></div>
              <div className="space-y-3">
                {loadingData && settlements.length === 0 ? <LoadingSpinner/> : settlements.length === 0 ? <p className="text-gray-500 text-center py-4">No settlements yet.</p> : ( settlements.map(settlement => (
                  <div key={settlement.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {settlement.payer_profile?.name || 'Unknown'} → {settlement.payee_profile?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(settlement.created_at).toLocaleDateString()}
                          {settlement.description && ` • ${settlement.description}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">${settlement.amount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'structuredChores' && householdId && (
          <ChoreDashboard householdId={householdId} />
        )}

        {activeTab === 'choresList' && ( // This is the OLD tasks system
            <div className="space-y-4">
                <div className="flex justify-between items-center"><h3 className="text-lg font-medium text-gray-900">Tasks (To-Do List)</h3><button onClick={() => setShowAddTask(true)} className="btn-primary-sm flex items-center"><Plus className="h-4 w-4 mr-1" />Add Task</button></div>
                 <div className="space-y-3"> {loadingData && tasks.filter(t => !t.completed).length === 0 && tasks.filter(t => t.completed).length === 0 ? <LoadingSpinner/> : tasks.filter(t => !t.completed).length === 0 && tasks.filter(t => t.completed).length === 0 ? <p className="text-gray-500 text-center py-4">No tasks yet.</p> : (<> {tasks.filter(t => !t.completed).length > 0 && <h4 className="text-sm font-medium text-gray-700">To Do</h4>} {tasks.filter(t => !t.completed).map(task => (<div key={task.id} className="bg-white rounded-lg shadow p-4"><div className="flex items-center justify-between"><div className="flex items-center"><button onClick={() => completeTask(task.id)} className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100" title="Mark task as complete"><div className="h-5 w-5 rounded-full border-2 border-gray-300 hover:border-green-500" /></button><div className="ml-3"><p className="font-medium text-gray-900">{task.title}</p>{task.profiles && (<p className="text-sm text-gray-500">Assigned to {task.profiles.name}</p>)}{!task.profiles && (<p className="text-sm text-gray-400">Unassigned</p>)}</div></div></div></div>))} {tasks.filter(t => t.completed).length > 0 && (<><h4 className="text-sm font-medium text-gray-500 mt-6 pt-4 border-t">Completed</h4>{tasks.filter(t => t.completed).map(task => (<div key={task.id} className="bg-gray-100 rounded-lg p-4 opacity-70"><div className="flex items-center"><CheckSquare className="h-5 w-5 text-green-500 flex-shrink-0" /><div className="ml-3"><p className="text-gray-500 line-through">{task.title}</p>{task.profiles && (<p className="text-xs text-gray-400 line-through">Done by {task.profiles.name}</p>)}</div></div></div>))}</>)} </>)} </div>
            </div>
        )}

        {activeTab === 'communication' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Members</h3>
                <button 
                    onClick={() => setShowManageJoinCode(true)} 
                    className="btn-secondary-sm flex items-center"
                >
                    <Share2 className="h-4 w-4 mr-1" /> Manage Join Code
                </button>
            </div>
            <div className="space-y-3">
              {loadingData && members.length === 0 ? <LoadingSpinner/> : members.map(member => (<div key={member.id} className="bg-white rounded-lg shadow p-4"><div className="flex items-center justify-between"><div className="flex items-center"><div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">{member.profiles?.name?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}</div><div className="ml-3"><p className="font-medium text-gray-900">{member.profiles?.name}</p><p className="text-xs text-gray-400">{member.role}</p></div></div></div></div>))}
            </div>
             {/* Chat Section */}
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Household Chat</h3>
              <HouseholdChat householdId={householdId} />
            </div>
          </div>
        )}

        {activeTab === 'rulesSettings' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">House Rules & Settings</h3>
            <div className="text-center text-gray-400 mt-8 p-4 border-2 border-dashed rounded-lg">Placeholder: Define house rules and manage household settings here.</div>
          </div>
        )}
      </div>

      {showAddExpense && <AddExpenseModal />}
      {showAddTask && <AddTaskModal />} {/* This is for the old "Tasks" */}
      {showSettleUp && <SettleUpModal />}
      {showAddRecurring && <AddRecurringExpenseModal />}
      {showManageJoinCode && householdId && (
        <ManageJoinCodeModal 
            householdId={householdId} 
            currentCode={currentJoinCode}
            onClose={() => setShowManageJoinCode(false)}
            onCodeRefreshed={(newCode) => {
                setCurrentJoinCode(newCode);
                if (household) setHousehold({...household, join_code: newCode });
            }}
        />
      )}
    </Layout>
  );
};

type AppState = 'loading' | 'landing' | 'authForm' | 'onboardingChoice' | 'householdSetup' | 'dashboard' | 'joinWithCode' | 'householdWelcome';

// App component (Main logic for app state and routing)
const App: React.FC = () => {
  // ... (App component logic remains largely the same, ensures household data is fetched for onboarding/dashboard decisions)
  const { user, loading: authLoading } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([]); // User's households
  const [loadingUserHouseholds, setLoadingUserHouseholds] = useState(true);
  const [appState, setAppState] = useState<AppState>('loading');
  const [isRegisteringForAuthForm, setIsRegisteringForAuthForm] = useState(false);
  const [welcomeHouseholdId, setWelcomeHouseholdId] = useState<string | null>(null);
  const [targetHouseholdAfterJoin, setTargetHouseholdAfterJoin] = useState<Household | null>(null);


  useEffect(() => {
    const determineState = async () => {
      if (authLoading) {
        setAppState('loading');
        return;
      }

      if (!user) {
        setAppState('landing');
        return;
      }

      setLoadingUserHouseholds(true);
      try {
        const userHouseholds = await api.getUserHouseholds(); // This RPC should return enough info
        setHouseholds(userHouseholds); 
        
        const queryParams = new URLSearchParams(window.location.search);
        const joinedHouseholdIdParam = queryParams.get('joinedHouseholdId'); 
        
        if (joinedHouseholdIdParam) {
          setWelcomeHouseholdId(joinedHouseholdIdParam);
          setAppState('householdWelcome');
          const nextURL = new URL(window.location.href);
          nextURL.searchParams.delete('joinedHouseholdId');
          window.history.replaceState({}, '', nextURL.toString());
        } else if (targetHouseholdAfterJoin) {
            setWelcomeHouseholdId(targetHouseholdAfterJoin.id);
            setAppState('householdWelcome');
            setTargetHouseholdAfterJoin(null); 
        } else if (userHouseholds.length === 0) {
          setAppState('onboardingChoice');
        } else {
          // Before going to dashboard, ensure chores are initialized for the primary household (if applicable)
          // For simplicity, we might rely on checkAndTriggerChoreRotation in HouseholdDetail/ChoreDashboard
          // Or, explicitly initialize here if needed for the first household.
          setAppState('dashboard');
        }
      } catch (error) {
        console.error("Error fetching user households", error);
        toast.error("Could not fetch your household information.");
        setAppState('onboardingChoice'); // Fallback
      } finally {
        setLoadingUserHouseholds(false);
      }
    };
    determineState();
  }, [user, authLoading, targetHouseholdAfterJoin]);

  if (appState === 'loading' || (user && loadingUserHouseholds)) return <LoadingSpinner />;
  if (appState === 'landing') return <LandingPageContent onSignIn={() => { setIsRegisteringForAuthForm(false); setAppState('authForm'); }} onSignUp={() => { setIsRegisteringForAuthForm(true); setAppState('authForm'); }} />;
  if (appState === 'authForm') return <AuthForm isRegisteringInitially={isRegisteringForAuthForm} />;
  if (appState === 'onboardingChoice') return <OnboardingChoice onCreateHousehold={() => setAppState('householdSetup')} onJoinHousehold={() => setAppState('joinWithCode')} />;
  if (appState === 'householdSetup') return <HouseholdSetupForm onHouseholdCreated={(hid) => { toast.success('Household created!'); setWelcomeHouseholdId(hid); setAppState('householdWelcome'); }} />;
  if (appState === 'joinWithCode') return <JoinHouseholdWithCode onJoined={(household) => { setTargetHouseholdAfterJoin(household); }} onCancel={() => setAppState('onboardingChoice')} />;
  if (appState === 'householdWelcome' && welcomeHouseholdId) {
      const joinedHouseholdDetails = households.find(h => h.id === welcomeHouseholdId) || targetHouseholdAfterJoin;
      return <HouseholdWelcomeDisplay 
                householdId={welcomeHouseholdId} 
                householdName={joinedHouseholdDetails?.name}
                onProceed={() => { setWelcomeHouseholdId(null); setAppState('dashboard'); }} 
             />;
  }
  if (appState === 'dashboard') return <Dashboard setAppState={setAppState} />;
  
  return <p>Something went wrong with application state. Current state: {appState}</p>;
};

// Default export (unchanged)
export default function RoomiesApp() {
  return ( <AuthProvider> <App /> </AuthProvider> );
}