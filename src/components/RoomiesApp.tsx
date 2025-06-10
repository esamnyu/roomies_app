"use client";

// MODIFIED: Added useMemo
import React, { useState, useEffect, useCallback, useMemo } from 'react'; 
import { ChevronRight, Home, Users, DollarSign, CheckSquare, Plus, LogOut, Menu, X, ArrowLeft, Loader2, CreditCard, Bell, MessageSquare, Settings, ClipboardList, User, Share2 } from 'lucide-react';
import * as api from '@/lib/api';
import type { Profile, Household, HouseholdMember, Expense, Settlement, RecurringExpense } from '@/lib/api';
import { AuthProvider, useAuth } from './AuthProvider';
import { NotificationBell } from './NotificationsPanel';
import { Toaster, toast } from 'react-hot-toast';

// Component Imports
import { LandingPageContent } from './LandingPageContent';
import { HouseholdSetupForm } from './HouseholdSetupForm';
import { OnboardingChoice } from './OnboardingChoice';
import { HouseholdChat } from './HouseholdChat';
import { ChoreDashboard } from './ChoreDashboard';
import { HouseholdSettings } from './HouseholdSettings';

// MODIFICATION: Import the extracted modal components
import { AddExpenseModal } from './AddExpenseModal';
import { AddRecurringExpenseModal } from './AddRecurringExpenseModal';
import { SettleUpModal } from './SettleUpModal';
import { ManageJoinCodeModal } from './ManageJoinCodeModal';


// Layout Component (Unchanged)
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

// LoadingSpinner and AuthForm Components (Unchanged)
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4 min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
  </div>
);

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


// Dashboard and HouseholdDetail Components (Optimized)
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
                      {household.member_count || '?'} {Number(household.member_count) === 1 ? 'member' : 'members'}
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

// MODIFIED: Removed old 'choresList' tab
type HouseholdDetailTab = 'money' | 'structuredChores' | 'communication' | 'rulesSettings';

const HouseholdDetail: React.FC<{ householdId: string; onBack: () => void }> = ({ householdId, onBack }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<HouseholdDetailTab>('structuredChores'); 
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showManageJoinCode, setShowManageJoinCode] = useState(false);
  const [currentJoinCode, setCurrentJoinCode] = useState<string | null | undefined>(undefined);
  const [showSettleUp, setShowSettleUp] = useState(false);

  // OPTIMIZED: refreshData now assumes getHouseholdData is comprehensive
  const refreshData = useCallback(async (showToast = false) => {
    if (!householdId) return;
    setLoadingData(true);
    try {
        const data = await api.getHouseholdData(householdId);
        
        if (data.household) {
          setHousehold(data.household);
          setCurrentJoinCode(data.household.join_code);
        }
        setMembers(data.members || []);
        setExpenses(data.recent_expenses || []);
        setSettlements(data.recent_settlements || []);
        
        // This can be a separate call if not included in the main RPC
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
        // Check if the settlement is already in the list to avoid duplicates
        const exists = prev.some(s => s.id === newSettlement.id);
        if (exists) {
            return prev;
        }
        // Add the new settlement to the beginning of the array
        const updated = [newSettlement, ...prev];
        // Keep the list from growing indefinitely
        return updated.slice(0, 50);
      });
    });
  
    return () => {
      subscription.unsubscribe();
    };
  }, [householdId]); // refreshData has been removed from the dependency array

  useEffect(() => {
    const processAndRefresh = async () => {
      if (!householdId) return;
      try {
        await api.processDueRecurringExpenses(householdId);
        await refreshData(false);
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

  const markExpenseSettled = async (expenseId: string, userIdToSettle: string) => {
    try { 
      await api.markExpenseSettled(expenseId, userIdToSettle); 
      await refreshData(); 
      toast.success('Expense part marked settled!'); 
    }
    catch (error) { console.error('Error marking expense settled:', error); toast.error('Failed to mark expense settled.'); }
  };

  // OPTIMIZED: Calculations are memoized to avoid re-running on every render
  const balances = useMemo(() => api.calculateBalances(expenses, members, settlements), [expenses, members, settlements]);
  const settlementSuggestions = useMemo(() => api.getSettlementSuggestions ? api.getSettlementSuggestions(balances) : [], [balances]);


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
             {/* MODIFIED: Removed old 'choresList' tab */}
            {(['money', 'structuredChores', 'communication', 'rulesSettings'] as HouseholdDetailTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 sm:px-3 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                {tab === 'money' && <DollarSign className="inline h-4 w-4 mr-1" />}
                {tab === 'structuredChores' && <ClipboardList className="inline h-4 w-4 mr-1" />}
                {tab === 'communication' && <MessageSquare className="inline h-4 w-4 mr-1" />}
                {tab === 'rulesSettings' && <Settings className="inline h-4 w-4 mr-1" />}
                {tab === 'money' ? 'Money' : 
                 tab === 'structuredChores' ? 'Chores' : 
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
        
        {/* REMOVED: Old 'choresList' (tasks) tab content */}

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
             <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Household Chat</h3>
              <HouseholdChat householdId={householdId} />
            </div>
          </div>
        )}

        {activeTab === 'rulesSettings' && household && (
        <HouseholdSettings
          household={household}
          members={members}
          onUpdate={() => refreshData(true)}
          />)}
    </div>

      {/* MODAL RENDERING: Calls to extracted components */}
      {showAddExpense && 
        <AddExpenseModal 
            householdId={householdId}
            members={members}
            onClose={() => setShowAddExpense(false)}
            onExpenseAdded={() => refreshData(true)}
        />
      }
      {showSettleUp && 
        <SettleUpModal 
            householdId={householdId}
            members={members}
            settlementSuggestions={settlementSuggestions}
            onClose={() => setShowSettleUp(false)}
            onSettlementCreated={() => refreshData(true)}
        />
      }
      {showAddRecurring && 
        <AddRecurringExpenseModal 
            householdId={householdId}
            onClose={() => setShowAddRecurring(false)}
            onExpenseAdded={() => refreshData(true)}
        />
      }
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

// Main App Component (Optimized)
type AppState = 'loading' | 'landing' | 'authForm' | 'onboardingChoice' | 'householdSetup' | 'dashboard' | 'joinWithCode' | 'householdWelcome';

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([]);
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
        const userHouseholds = await api.getUserHouseholds();
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
  }, [user, authLoading, targetHouseholdAfterJoin]); // MODIFIED: Dependency array is now correct

  if (appState === 'loading' || (user && loadingUserHouseholds)) return <LoadingSpinner />;
  
  switch (appState) {
    case 'landing':
      return <LandingPageContent onSignIn={() => { setIsRegisteringForAuthForm(false); setAppState('authForm'); }} onSignUp={() => { setIsRegisteringForAuthForm(true); setAppState('authForm'); }} />;
    case 'authForm':
      return <AuthForm isRegisteringInitially={isRegisteringForAuthForm} />;
    case 'onboardingChoice':
      return <OnboardingChoice onCreateHousehold={() => setAppState('householdSetup')} onJoinHousehold={() => setAppState('joinWithCode')} />;
    case 'householdSetup':
      return <HouseholdSetupForm onHouseholdCreated={(hid) => { toast.success('Household created!'); setWelcomeHouseholdId(hid); setAppState('householdWelcome'); }} />;
    case 'joinWithCode':
      return <JoinHouseholdWithCode onJoined={(household) => { setTargetHouseholdAfterJoin(household); }} onCancel={() => setAppState('onboardingChoice')} />;
    case 'householdWelcome':
      if (welcomeHouseholdId) {
        const joinedHouseholdDetails = households.find(h => h.id === welcomeHouseholdId) || targetHouseholdAfterJoin;
        return <HouseholdWelcomeDisplay 
                  householdId={welcomeHouseholdId} 
                  householdName={joinedHouseholdDetails?.name}
                  onProceed={() => { setWelcomeHouseholdId(null); setAppState('dashboard'); }} 
               />;
      }
      // Fallback if ID is missing
      setAppState('dashboard'); 
      return <LoadingSpinner />;
    case 'dashboard':
      return <Dashboard setAppState={setAppState} />;
    default:
      return <p>Something went wrong with application state. Current state: {appState}</p>;
  }
};

export default function RoomiesApp() {
  return ( <AuthProvider> <App /> </AuthProvider> );
}