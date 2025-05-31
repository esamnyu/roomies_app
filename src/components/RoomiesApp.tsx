"use client";
import React, { useState, useContext, createContext, useEffect } from 'react';
import { ChevronRight, Home, Users, DollarSign, CheckSquare, Plus, UserPlus, LogOut, Menu, X, ArrowLeft, Check, User, Loader2, CreditCard, ArrowRightLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import * as api from '@/lib/api';
import type { Profile, Household, HouseholdMember, Expense, Task, Settlement } from '@/lib/api';

// Auth Context
interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
});

// Auth Provider
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          const { data: profileData } = await api.getProfile(session.user.id);
          if (profileData) setProfile(profileData);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { data: profileData } = await api.getProfile(session.user.id);
        if (profileData) setProfile(profileData);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await api.signIn(email, password);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { error } = await api.signUp(email, password, name);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await api.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

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
              <span className="text-sm text-gray-600">{profile?.name}</span>
              <button
                onClick={signOut}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-4 py-3 space-y-2">
              <div className="text-sm text-gray-600">{profile?.name}</div>
              <button
                onClick={signOut}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
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
  );
};

// Loading Component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
  </div>
);

// Auth Pages
const LoginPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);
    
    try {
      const { error } = isRegistering 
        ? await signUp(email, password, name)
        : await signIn(email, password);
      
      if (error) {
        setError(error.message);
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

// Dashboard
const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateHousehold, setShowCreateHousehold] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState<string | null>(null);

  useEffect(() => {
    loadHouseholds();
  }, [user]);

  const loadHouseholds = async () => {
    try {
      setLoading(true);
      const data = await api.getUserHouseholds();
      setHouseholds(data);
    } catch (error) {
      console.error('Error loading households:', error);
    } finally {
      setLoading(false);
    }
  };

  const createHousehold = async () => {
    if (!newHouseholdName.trim()) return;
    
    setCreating(true);
    try {
      await api.createHousehold(newHouseholdName);
      await loadHouseholds();
      setNewHouseholdName('');
      setShowCreateHousehold(false);
    } catch (error) {
      console.error('Error creating household:', error);
      alert('Failed to create household');
    } finally {
      setCreating(false);
    }
  };

  if (selectedHousehold) {
    return <HouseholdDetail householdId={selectedHousehold} onBack={() => setSelectedHousehold(null)} />;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Your Households</h2>
          <button
            onClick={() => setShowCreateHousehold(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Household
          </button>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : households.length === 0 ? (
          <div className="text-center py-12">
            <Home className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No households</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new household.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {households.map((household) => (
              <button
                key={household.id}
                onClick={() => setSelectedHousehold(household.id)}
                className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{household.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {household.memberCount} {household.memberCount === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}

        {showCreateHousehold && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Household</h3>
              <input
                type="text"
                placeholder="Household name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={newHouseholdName}
                onChange={(e) => setNewHouseholdName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createHousehold()}
              />
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateHousehold(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={createHousehold}
                  disabled={creating}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

// Household Detail Page
const HouseholdDetail: React.FC<{ householdId: string; onBack: () => void }> = ({ householdId, onBack }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'expenses' | 'members' | 'tasks' | 'settlements'>('expenses');
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (await api.getHouseholdData(householdId)) {
        // Use optimized function if available
        loadHouseholdDataOptimized();
      } else {
        // Fallback to original method
        loadHouseholdData();
      }
    };
    fetchData();
  }, [householdId]);

  const loadHouseholdDataOptimized = async () => {
    try {
      setLoading(true);
      const data = await api.getHouseholdData(householdId);
      
      // Parse the optimized response
      if (data) {
        setHousehold(data.household);
        setMembers(data.members || []);
        setExpenses(data.recent_expenses || []);
        setTasks(data.tasks || []);
        setSettlements(data.recent_settlements || []);
      }
    } catch (error) {
      console.error('Error loading household data:', error);
      // Fallback to original method
      loadHouseholdData();
    } finally {
      setLoading(false);
    }
  };

  const loadHouseholdData = async () => {
    try {
      setLoading(true);
      const [membersData, expensesData, tasksData, settlementsData] = await Promise.all([
        api.getHouseholdMembers(householdId),
        api.getHouseholdExpenses(householdId),
        api.getHouseholdTasks(householdId),
        api.getHouseholdSettlements ? api.getHouseholdSettlements(householdId) : Promise.resolve([])
      ]);
      
      setMembers(membersData);
      setExpenses(expensesData);
      setTasks(tasksData);
      setSettlements(settlementsData);
      
      // Get household name from members data
      if (membersData.length > 0 && membersData[0].households) {
        setHousehold(membersData[0].households);
      }
    } catch (error) {
      console.error('Error loading household data:', error);
    } finally {
      setLoading(false);
    }
  };

  const balances = api.calculateBalances(expenses, members, settlements);
  const settlementSuggestions = api.getSettlementSuggestions ? api.getSettlementSuggestions(balances) : [];

  const AddExpenseModal = () => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
      if (!description || !amount) return;
      
      setSubmitting(true);
      try {
        await api.createExpense(householdId, description, parseFloat(amount));
        await loadHouseholdData();
        setShowAddExpense(false);
      } catch (error) {
        console.error('Error creating expense:', error);
        alert('Failed to create expense');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Expense</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input
                type="text"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setShowAddExpense(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Expense'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const AddTaskModal = () => {
    const [title, setTitle] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
      if (!title) return;
      
      setSubmitting(true);
      try {
        await api.createTask(householdId, title, assignedTo || undefined);
        await loadHouseholdData();
        setShowAddTask(false);
      } catch (error) {
        console.error('Error creating task:', error);
        alert('Failed to create task');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Task</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Task</label>
              <input
                type="text"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Assign to (optional)</label>
              <select
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="">Unassigned</option>
                {members.map(member => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.profiles?.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setShowAddTask(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
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
        setDescription(`Payment to ${selectedSuggestion.toProfile.name}`);
      }
    }, [selectedSuggestion]);

    const handleSubmit = async () => {
      if (!payeeId || !customAmount) return;
      
      setSubmitting(true);
      try {
        await api.createSettlement(
          householdId,
          payeeId,
          parseFloat(customAmount),
          description
        );
        await loadHouseholdData();
        setShowSettleUp(false);
      } catch (error) {
        console.error('Error creating settlement:', error);
        alert('Failed to record settlement');
      } finally {
        setSubmitting(false);
      }
    };

    const myDebts = settlementSuggestions.filter(s => s.from === user?.id);
    const owedToMe = settlementSuggestions.filter(s => s.to === user?.id);

    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Settle Up</h3>
          
          {settlementSuggestions.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Suggested Settlements</h4>
              
              {myDebts.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">You owe:</p>
                  <div className="space-y-2">
                    {myDebts.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedSuggestion(suggestion)}
                        className={`w-full text-left p-3 rounded-lg border ${
                          selectedSuggestion === suggestion
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm">
                            Pay <strong>{suggestion.toProfile.name}</strong>
                          </span>
                          <span className="font-medium">${suggestion.amount.toFixed(2)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {owedToMe.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Owed to you:</p>
                  <div className="space-y-2">
                    {owedToMe.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className="w-full text-left p-3 rounded-lg border border-gray-200 bg-gray-50"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            <strong>{suggestion.fromProfile.name}</strong> owes you
                          </span>
                          <span className="font-medium text-gray-600">${suggestion.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Pay to</label>
              <select
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={payeeId}
                onChange={(e) => setPayeeId(e.target.value)}
              >
                <option value="">Select recipient</option>
                {members
                  .filter(member => member.user_id !== user?.id)
                  .map(member => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.profiles?.name}
                    </option>
                  ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input
                type="number"
                step="0.01"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
              <input
                type="text"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Payment for..."
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setShowSettleUp(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !payeeId || !customAmount}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Payment'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const markExpenseSettled = async (expenseId: string, userId: string) => {
    try {
      await api.markExpenseSettled(expenseId, userId);
      await loadHouseholdData();
    } catch (error) {
      console.error('Error marking expense as settled:', error);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      await api.completeTask(taskId);
      await loadHouseholdData();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  if (loading) {
    return (
      <Layout title="Loading..." showBack onBack={onBack}>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout title={household?.name || 'Household'} showBack onBack={onBack}>
      <div className="space-y-6">
        {/* Balance Summary with Settle Up */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Balance Summary</h3>
            <button
              onClick={() => setShowSettleUp(true)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="h-4 w-4 mr-1" />
              Settle Up
            </button>
          </div>
          <div className="space-y-2">
            {balances.map(balance => (
              <div key={balance.userId} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{balance.profile?.name}</span>
                <span className={`text-sm font-medium ${
                  balance.balance > 0 ? 'text-green-600' : balance.balance < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {balance.balance > 0 ? '+' : ''}${Math.abs(balance.balance).toFixed(2)}
                  {balance.balance < 0 && ' owed'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'expenses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DollarSign className="inline h-4 w-4 mr-1" />
              Expenses
            </button>
            <button
              onClick={() => setActiveTab('settlements')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settlements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ArrowRightLeft className="inline h-4 w-4 mr-1" />
              Settlements
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="inline h-4 w-4 mr-1" />
              Members
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tasks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CheckSquare className="inline h-4 w-4 mr-1" />
              Tasks
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Recent Expenses</h3>
              <button
                onClick={() => setShowAddExpense(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Expense
              </button>
            </div>
            <div className="space-y-3">
              {expenses.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No expenses yet</p>
              ) : (
                expenses.map(expense => (
                  <div key={expense.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{expense.description}</h4>
                        <p className="text-sm text-gray-500">
                          Paid by {expense.profiles?.name} • {expense.date}
                        </p>
                        
                        {/* Show who owes what */}
                        <div className="mt-2 space-y-1">
                          {expense.expense_splits?.filter(split => 
                            split.user_id !== expense.paid_by && !split.settled
                          ).map(split => (
                            <div key={split.id} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{split.profiles?.name} owes</span>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">${split.amount.toFixed(2)}</span>
                                <button
                                  onClick={() => markExpenseSettled(expense.id, split.user_id)}
                                  className="text-xs text-blue-600 hover:text-blue-500"
                                >
                                  Mark paid
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-medium text-gray-900">${expense.amount.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">
                          ${(expense.amount / members.length).toFixed(2)} each
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'settlements' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Recent Settlements</h3>
            </div>
            <div className="space-y-3">
              {settlements.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No settlements yet</p>
              ) : (
                settlements.map(settlement => (
                  <div key={settlement.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {settlement.payer_profile?.name} → {settlement.payee_profile?.name}
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
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Members</h3>
              <button 
                onClick={() => setShowInviteMember(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Invite
              </button>
            </div>
            <div className="space-y-3">
              {members.map(member => (
                <div key={member.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{member.profiles?.name}</p>
                        <p className="text-sm text-gray-500">{member.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
              <button
                onClick={() => setShowAddTask(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </button>
            </div>
            <div className="space-y-3">
              {tasks.filter(t => !t.completed).length === 0 && tasks.filter(t => t.completed).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No tasks yet</p>
              ) : (
                <>
                  {tasks.filter(t => !t.completed).map(task => (
                    <div key={task.id} className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <button
                            onClick={() => completeTask(task.id)}
                            className="flex-shrink-0"
                          >
                            <div className="h-5 w-5 rounded border-2 border-gray-300 hover:border-gray-400" />
                          </button>
                          <div className="ml-3">
                            <p className="font-medium text-gray-900">{task.title}</p>
                            {task.profiles && (
                              <p className="text-sm text-gray-500">Assigned to {task.profiles.name}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {tasks.filter(t => t.completed).length > 0 && (
                    <>
                      <h4 className="text-sm font-medium text-gray-500 mt-6">Completed</h4>
                      {tasks.filter(t => t.completed).map(task => (
                        <div key={task.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center">
                            <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                            <p className="ml-3 text-gray-500 line-through">{task.title}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showAddExpense && <AddExpenseModal />}
      {showAddTask && <AddTaskModal />}
      {showSettleUp && <SettleUpModal />}
      {showInviteMember && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Member</h3>
            <p className="text-sm text-gray-500 mb-4">
              Invitation functionality coming soon! For now, share the household name with your roommates.
            </p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowInviteMember(false)}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

// Main App Component
const App: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return user ? <Dashboard /> : <LoginPage />;
};

// Export with Auth Provider
export default function RoomiesApp() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}