"use client";

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
import { AddExpenseModal } from './AddExpenseModal';
import { AddRecurringExpenseModal } from './AddRecurringExpenseModal';
import { SettleUpModal } from './SettleUpModal';
import { ManageJoinCodeModal } from './ManageJoinCodeModal';
import { Button } from '@/components/ui/Button';

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
      <div className="min-h-screen bg-secondary">
        <header className="bg-background shadow-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                {showBack && (
                  <button onClick={onBack} className="mr-3 p-2 rounded-md hover:bg-secondary">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <h1 className="text-xl font-semibold text-foreground">{title}</h1>
              </div>

              <div className="hidden md:flex items-center space-x-4">
                <NotificationBell />
                <span className="text-sm text-secondary-foreground">{profile?.name}</span>
                <Button onClick={signOut} variant="secondary" size="sm">
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </Button>
              </div>

              <div className="flex items-center md:hidden">
                <NotificationBell />
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="ml-2 p-2 rounded-md hover:bg-secondary">
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border">
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary-foreground">{profile?.name}</span>
                </div>
                <Button onClick={signOut} variant="secondary" size="sm" className="w-full justify-start">
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </Button>
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

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4 min-h-screen bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      if (authError) setError(authError.message);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) handleSubmit();
  };

  const inputStyles = `relative block w-full appearance-none px-3 py-2 border border-input text-foreground placeholder-secondary-foreground/50 focus:z-10 focus:border-ring focus:outline-none focus:ring-ring sm:text-sm`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Welcome to Roomies
          </h2>
          <p className="mt-2 text-center text-sm text-secondary-foreground">
            {isRegistering ? 'Create your account' : 'Sign in to manage your shared living space'}
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            {isRegistering && (
              <div>
                <input type="text" required className={`${inputStyles} rounded-t-md`} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} onKeyPress={handleKeyPress}/>
              </div>
            )}
            <div>
              <input type="email" required className={`${inputStyles} ${isRegistering ? '' : 'rounded-t-md'}`} placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} onKeyPress={handleKeyPress} />
            </div>
            <div>
              <input type="password" required className={`${inputStyles} rounded-b-md`} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={handleKeyPress} />
            </div>
          </div>

          {error && (
            <div className="text-destructive text-sm text-center">{error}</div>
          )}

          <div>
            <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isRegistering ? 'Create Account' : 'Sign in')}
            </Button>
          </div>

          <div className="text-center">
            <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm text-primary hover:text-primary/80" disabled={isLoading}>
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
  
  const inputStyles = "mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm uppercase tracking-widest text-center";

  return (
    <Layout title="Join Household">
      <div className="max-w-md mx-auto bg-background p-8 rounded-lg shadow-md mt-8">
        <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Enter Join Code</h2>
        <p className="text-secondary-foreground mb-4 text-center">Ask a member of the household for the 4-character join code.</p>
        <div className="space-y-4">
          <div>
            <label htmlFor="joinCode" className="block text-sm font-medium text-foreground">4-Character Code</label>
            <input type="text" id="joinCode" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().trim())} maxLength={4} className={inputStyles} placeholder="XYZ1" autoCapitalize="characters" autoComplete="off" spellCheck="false" />
          </div>
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <Button onClick={handleSubmit} disabled={isLoading || joinCode.length !== 4} className="w-full">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join Household'}
          </Button>
          <Button onClick={onCancel} variant="secondary" className="w-full">
            Cancel
          </Button>
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="max-w-lg w-full bg-white p-8 rounded-xl shadow-2xl text-center">
        <CheckSquare className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold text-primary mb-4">Welcome to {nameToShow}!</h1>
        <p className="text-secondary-foreground mb-6">You've successfully joined the household.</p>
        <Button onClick={onProceed} size="lg" className="mt-8 w-full">
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
};

const Dashboard: React.FC<{ setAppState: (state: AppState) => void }> = ({ setAppState }) => {
  const { profile } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loadingHouseholds, setLoadingHouseholds] = useState(true);
  const [selectedHousehold, setSelectedHousehold] = useState<string | null>(null);

  const loadHouseholds = useCallback(async () => {
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
  }, []);

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
          <h2 className="text-2xl font-bold text-foreground">Your Households</h2>
          <Button onClick={() => setAppState('householdSetup')}>
            <Plus className="h-4 w-4 mr-2" /> New Household
          </Button>
        </div>

        {loadingHouseholds ? (
          <LoadingSpinner />
        ) : households.length === 0 ? (
          <div className="text-center py-12 bg-background p-8 rounded-lg shadow">
            <Home className="mx-auto h-12 w-12 text-secondary-foreground/50" />
            <h3 className="mt-2 text-lg font-medium text-foreground">No households yet.</h3>
            <p className="mt-1 text-sm text-secondary-foreground">Get started by creating a new household or joining one with a code.</p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
                <Button onClick={() => setAppState('householdSetup')}>Create New Household</Button>
                <Button onClick={() => setAppState('joinWithCode')} variant="secondary">Join with Code</Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {households.map((household) => (
              <button key={household.id} onClick={() => setSelectedHousehold(household.id)} className="bg-background p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left w-full border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-foreground">{household.name}</h3>
                    <p className="mt-1 text-sm text-secondary-foreground">
                      {household.member_count || '?'} {Number(household.member_count) === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-secondary-foreground/50" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

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

  const balances = useMemo(() => api.calculateBalances(expenses, members, settlements), [expenses, members, settlements]);
  const settlementSuggestions = useMemo(() => api.getSettlementSuggestions ? api.getSettlementSuggestions(balances) : [], [balances]);

  if (loadingData && !household) return <Layout title="Loading Household..." showBack onBack={onBack}><LoadingSpinner /></Layout>;

  return (
    <Layout title={household?.name || 'Household Details'} showBack onBack={onBack}>
      <div className="space-y-6">
        <div className="bg-background rounded-lg shadow p-6 border border-border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-foreground">Balance Summary</h3>
            <Button onClick={() => setShowSettleUp(true)} size="sm">
              <CreditCard className="h-4 w-4 mr-1" />Settle Up
            </Button>
          </div>
          <div className="space-y-2">
            {balances.length > 0 ? balances.map(balance => (
              <div key={balance.userId} className="flex justify-between items-center">
                <span className="text-sm text-secondary-foreground">{balance.profile?.name}</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${balance.balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {balance.balance > 0 ? '+' : ''}${Math.abs(balance.balance).toFixed(2)}{balance.balance < 0 && ' owed'}
                  </span>
                </div>
              </div>
            )) : <p className="text-sm text-secondary-foreground">No balances to show yet. Add some expenses!</p>}
          </div>
        </div>

        <div className="border-b border-border">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
            {(['money', 'structuredChores', 'communication', 'rulesSettings'] as HouseholdDetailTab[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`py-2 px-1 sm:px-3 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-secondary-foreground hover:text-foreground hover:border-border'}`}>
                {tab === 'money' && <DollarSign className="inline h-4 w-4 mr-1" />}
                {tab === 'structuredChores' && <ClipboardList className="inline h-4 w-4 mr-1" />}
                {tab === 'communication' && <MessageSquare className="inline h-4 w-4 mr-1" />}
                {tab === 'rulesSettings' && <Settings className="inline h-4 w-4 mr-1" />}
                {tab === 'money' ? 'Money' : tab === 'structuredChores' ? 'Chores' : tab === 'communication' ? 'Communication' : 'Rules & Settings'}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'money' && (
           <div className="space-y-6">
             <div className="bg-secondary rounded-lg p-4">
               <div className="flex justify-between items-center mb-3">
                 <h4 className="text-sm font-medium text-foreground">Recurring Expenses</h4>
                 <Button onClick={() => setShowAddRecurring(true)} variant="outline" size="sm"><Plus className="h-4 w-4 inline mr-1" />Add Recurring</Button>
               </div>
               {loadingData && recurringExpenses.length === 0 ? <LoadingSpinner/> : recurringExpenses.length === 0 ? <p className="text-sm text-secondary-foreground">No recurring expenses.</p> : ( <div className="space-y-2">{recurringExpenses.map(rec => (<div key={rec.id} className="flex justify-between items-center text-sm p-2 bg-background rounded shadow-sm"><div><span className="font-medium">{rec.description}</span><span className="text-secondary-foreground ml-2">${rec.amount.toFixed(2)} {rec.frequency}</span></div><div className="text-secondary-foreground">Next: {new Date(rec.next_due_date + (rec.next_due_date.includes('T') ? '' : 'T00:00:00')).toLocaleDateString()}</div></div>))}</div> )}
             </div>
             <div className="space-y-4">
               <div className="flex justify-between items-center"><h3 className="text-lg font-medium text-foreground">One-Time Expenses</h3><Button onClick={() => setShowAddExpense(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Add Expense</Button></div>
               <div className="space-y-3">
                {loadingData && expenses.length === 0 ? <LoadingSpinner/> : expenses.length === 0 ? <p className="text-secondary-foreground text-center py-4">No one-time expenses.</p> : ( expenses.map(expense => (<div key={expense.id} className="bg-background rounded-lg shadow p-4 border border-border"><div className="flex justify-between items-start"><div className="flex-1"><h4 className="font-medium text-foreground">{expense.description}</h4><p className="text-sm text-secondary-foreground">Paid by {expense.profiles?.name} • {new Date(expense.date + (expense.date.includes('T') ? '' : 'T00:00:00')).toLocaleDateString()}</p></div><div className="text-right ml-4"><p className="font-medium text-foreground">${expense.amount.toFixed(2)}</p></div></div></div>)) )}
              </div>
             </div>
           </div>
        )}

        {activeTab === 'structuredChores' && householdId && <ChoreDashboard householdId={householdId} />}
        
        {activeTab === 'communication' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-foreground">Members</h3>
                <Button onClick={() => setShowManageJoinCode(true)} variant="secondary" size="sm">
                    <Share2 className="h-4 w-4 mr-1" /> Manage Join Code
                </Button>
            </div>
            <div className="space-y-3">
              {loadingData && members.length === 0 ? <LoadingSpinner/> : members.map(member => (<div key={member.id} className="bg-background rounded-lg shadow p-4 border border-border"><div className="flex items-center justify-between"><div className="flex items-center"><div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground">{member.profiles?.name?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}</div><div className="ml-3"><p className="font-medium text-foreground">{member.profiles?.name}</p><p className="text-xs text-secondary-foreground">{member.role}</p></div></div></div></div>))}
            </div>
             <div className="mt-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Household Chat</h3>
              <HouseholdChat householdId={householdId} />
            </div>
          </div>
        )}

        {activeTab === 'rulesSettings' && household && ( <HouseholdSettings household={household} members={members} onUpdate={() => refreshData(true)} />)}
      </div>

      {showAddExpense && <AddExpenseModal householdId={householdId} members={members} onClose={() => setShowAddExpense(false)} onExpenseAdded={() => refreshData(true)} />}
      {showSettleUp && <SettleUpModal householdId={householdId} members={members} settlementSuggestions={settlementSuggestions} onClose={() => setShowSettleUp(false)} onSettlementCreated={() => refreshData(true)} />}
      {showAddRecurring && <AddRecurringExpenseModal householdId={householdId} onClose={() => setShowAddRecurring(false)} onExpenseAdded={() => refreshData(true)} />}
      {showManageJoinCode && householdId && <ManageJoinCodeModal householdId={householdId} currentCode={currentJoinCode} onClose={() => setShowManageJoinCode(false)} onCodeRefreshed={(newCode) => { setCurrentJoinCode(newCode); if (household) setHousehold({...household, join_code: newCode }); }} />}
    </Layout>
  );
};

type AppState = 'loading' | 'landing' | 'authForm' | 'onboardingChoice' | 'householdSetup' | 'dashboard' | 'joinWithCode' | 'householdWelcome';

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
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
      try {
        const userHouseholds = await api.getUserHouseholds();
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
        setAppState('onboardingChoice');
      }
    };
    determineState();
  }, [user, authLoading, targetHouseholdAfterJoin]);

  if (appState === 'loading') return <LoadingSpinner />;
  
  switch (appState) {
    case 'landing': return <LandingPageContent onSignIn={() => { setIsRegisteringForAuthForm(false); setAppState('authForm'); }} onSignUp={() => { setIsRegisteringForAuthForm(true); setAppState('authForm'); }} />;
    case 'authForm': return <AuthForm isRegisteringInitially={isRegisteringForAuthForm} />;
    case 'onboardingChoice': return <OnboardingChoice onCreateHousehold={() => setAppState('householdSetup')} onJoinHousehold={() => setAppState('joinWithCode')} />;
    case 'householdSetup': return <HouseholdSetupForm onHouseholdCreated={(hid) => { toast.success('Household created!'); setWelcomeHouseholdId(hid); setAppState('householdWelcome'); }} />;
    case 'joinWithCode': return <JoinHouseholdWithCode onJoined={(household) => { setTargetHouseholdAfterJoin(household); }} onCancel={() => setAppState('onboardingChoice')} />;
    case 'householdWelcome':
      if (welcomeHouseholdId) {
        return <HouseholdWelcomeDisplay householdId={welcomeHouseholdId} onProceed={() => { setWelcomeHouseholdId(null); setAppState('dashboard'); }} />;
      }
      setAppState('dashboard'); 
      return <LoadingSpinner />;
    case 'dashboard': return <Dashboard setAppState={setAppState} />;
    default: return <p>Something went wrong. Current state: {appState}</p>;
  }
};

export default function RoomiesApp() {
  return ( <AuthProvider> <App /> </AuthProvider> );
}