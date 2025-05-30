
"use client";
import React, { useState, useContext, createContext, useEffect } from 'react';
import { ChevronRight, Home, Users, DollarSign, CheckSquare, Plus, UserPlus, LogOut, Menu, X, ArrowLeft, Check, Calendar, User as LucideUserIcon } from 'lucide-react'; // Renamed User to avoid conflict
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// Types

// User object used within the AuthContext and for displaying current user info
interface User {
  id: string; // from Supabase auth: auth.users.id
  email?: string; // from Supabase auth: auth.users.email
  name: string; // from public.profiles.name (fallback to email part if not available)
  avatarUrl?: string; // from public.profiles.avatar_url
}

// Represents the 'households' table
interface Household {
  id: string; // PK, UUID
  name: string;
  created_by: string; // FK to auth.users.id
  created_at: string; // timestamptz
  // updated_at: string; // timestamptz, if you select it
}

// Represents the 'household_members' table, potentially joined with 'profiles'
interface HouseholdMember {
  id: string; // PK, UUID for the membership record itself
  household_id: string; // FK to households.id
  user_id: string; // FK to auth.users.id (and public.profiles.id)
  role: 'admin' | 'member';
  joined_at: string; // timestamptz
  
  // Nested profile data if joined: .select('*, profiles(name, avatar_url)')
  profiles?: { 
    name: string;
    avatar_url?: string | null;
  } | null; 
  
  // Client-side enriched/denormalized fields (optional as they are added after fetch)
  user_name?: string; 
  user_avatar_url?: string | null;
}

// Represents the 'expense_splits' table
interface ExpenseSplit {
  id: string; // PK, UUID
  expense_id: string; // FK to expenses.id
  user_id: string; // FK to auth.users.id
  amount: number; // numeric
  settled: boolean;
  settled_at?: string | null; // timestamptz
  
  // Client-side enriched/denormalized fields
  user_name?: string;
  user_avatar_url?: string | null;
}

// Represents the 'expenses' table, potentially with 'expense_splits' embedded
interface Expense {
  id: string; // PK, UUID
  household_id: string; // FK to households.id
  description: string;
  amount: number; // numeric
  paid_by: string; // FK to auth.users.id
  date: string; // date type in DB, string in JS
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  
  // Embedded splits if queried like: .select('*, expense_splits(*)')
  expense_splits: ExpenseSplit[]; 
  
  // Client-side enriched/denormalized fields
  paid_by_user_name?: string;
  paid_by_user_avatar_url?: string | null;
}

// Represents the 'tasks' table
interface Task {
  id: string; // PK, UUID
  household_id: string; // FK to households.id
  title: string;
  assigned_to?: string | null; // FK to auth.users.id
  completed: boolean;
  completed_at?: string | null; // timestamptz
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  
  // Client-side enriched/denormalized fields
  assigned_to_user_name?: string;
  assigned_to_user_avatar_url?: string | null;
}

// Represents the structure for displaying user balances within a household
interface Balance {
  userId: string; // Corresponds to a user_id
  user: { // Simplified user object for display purposes within Balance context
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  balance: number; // positive = user is owed, negative = user owes
}

// Auth Context
const AuthContext = createContext<{
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>; // Make logout async
  loading: boolean;
}>({
  user: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  loading: true,
});

// Auth Provider
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session);
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (session?.user) {
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('name, avatar_url')
              .eq('id', session.user.id)
              .single();

            if (error) {
              console.error('Error fetching profile:', error);
              // Potentially sign out user if profile is crucial and missing
              // await supabase.auth.signOut(); 
              // setUser(null);
            }
            
            const appUser: User = {
              id: session.user.id,
              email: session.user.email,
              name: profile?.name || session.user.email?.split('@')[0] || 'User', // Fallback for name
              avatarUrl: profile?.avatar_url,
            };
            setUser(appUser);
          } catch (profileError) {
            console.error('Error processing profile:', profileError);
            setUser(null); // Or handle more gracefully
          }
        } else {
          setUser(null);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      // Only set loading to false once after initial check or sign-in/out attempt
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
         setLoading(false);
      }
    });

    // Check initial session (this will trigger INITIAL_SESSION above)
    // supabase.auth.getSession().then(({ data: { session } }) => {
    //   if (!session) { // If no session, ensure loading is false
    //      setLoading(false);
    //   }
    //   // onAuthStateChange will handle setting user and loading state
    // });


    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login error:', error);
      throw error;
    }
    // onAuthStateChange will handle setting the user state
  };

  const register = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }, // This will be available in raw_user_meta_data for your trigger
      },
    });
    if (error) {
      console.error('Registration error:', error);
      throw error;
    }
    // Optional: handle if user needs to be manually set or if confirmation is needed
    // For now, assuming handle_new_user trigger and onAuthStateChange do the work.
    // If email confirmation is enabled, user won't be signed in immediately.
    console.log('Registration successful, session data:', data.session);
    // If session is returned and email confirmation is off, onAuthStateChange will pick it up.
    // If email confirmation is on, user needs to confirm first.
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      throw error;
    }
    // onAuthStateChange will handle setting user to null
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
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
  const { user, logout } = useAuth();
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
              <span className="text-sm text-gray-600">{user?.name}</span>
              <button
                onClick={logout}
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
              <div className="text-sm text-gray-600">{user?.name}</div>
              <button
                onClick={logout}
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

// Auth Pages
const LoginPage: React.FC = () => {
  const { login, register } = useAuth(); // Added register here
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = async () => {
    try {
      setError(''); // Clear previous errors
      if (isRegistering) {
        // Ensure name is provided for registration
        if (!name.trim()) {
          setError('Name is required for registration.');
          return;
        }
        await register(email, password, name);
        // Potentially show a message about checking email for confirmation if enabled
      } else {
        await login(email, password);
      }
      // Navigation or state change will be handled by onAuthStateChange
      // leading to Dashboard display if successful.
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || 'An unexpected error occurred.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
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
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isRegistering ? 'Create Account' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard: React.FC = () => {
  const { user } = useAuth(); // Assuming useAuth provides the authenticated user
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loadingHouseholds, setLoadingHouseholds] = useState(true);
  const [showCreateHousehold, setShowCreateHousehold] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [selectedHousehold, setSelectedHousehold] = useState<string | null>(null); // Keep this for navigation
    const [dashboardError, setDashboardError] = useState<string | null>(null); // Renamed for clarity
    const [isCreatingHousehold, setIsCreatingHousehold] = useState(false);

  // Fetch households
  useEffect(() => {
    const fetchHouseholds = async () => {
      if (!user) {
        setHouseholds([]);
        setLoadingHouseholds(false);
        return;
      }

      setLoadingHouseholds(true);
      setDashboardError(null);
      try {
        // Supabase RLS policy "Users can view households they belong to"
        // is expected to filter households for the current user.
        const { data, error: householdsError } = await supabase
          .from('households')
          .select('*'); // RLS handles filtering

        if (householdsError) {
          throw householdsError;
        }
        setHouseholds(data || []);
      } catch (err: any) {
        console.error('Error fetching households:', err);
        setDashboardError('Failed to fetch households. ' + err.message);
        setHouseholds([]);
      } finally {
        setLoadingHouseholds(false);
      }
    };

    fetchHouseholds();
  }, [user]); // Re-fetch if user changes

  const handleCreateHousehold = async () => {
    if (!newHouseholdName.trim() || !user) {
      setDashboardError('Household name is required.'); // Use dashboardError for this modal
      return;
    }
    setDashboardError(null);
    setIsCreatingHousehold(true);

    try {
      // 1. Create the household
      const { data: newHousehold, error: createHouseholdError } = await supabase
        .from('households')
        .insert({ name: newHouseholdName, created_by: user.id })
        .select() // To get the created household back, especially its ID
        .single(); // Expecting a single object back

      if (createHouseholdError) {
        throw createHouseholdError;
      }

      if (!newHousehold) {
        throw new Error('Failed to create household, no data returned.');
      }

      // 2. Add the creator as an admin member of the new household
      const { error: addMemberError } = await supabase
        .from('household_members')
        .insert({ household_id: newHousehold.id, user_id: user.id, role: 'admin' });

      if (addMemberError) {
        // Attempt to clean up if adding member fails? This is complex client-side.
        // For now, log error. A database function/transaction would be better.
        console.error('Failed to add creator to household members after household creation:', addMemberError);
        // Potentially inform user that member addition failed.
        throw new Error(`Household created, but failed to add you as a member: ${addMemberError.message}`);
      }

      // Add to local state or re-fetch
      setHouseholds(prevHouseholds => [...prevHouseholds, newHousehold]);
      setNewHouseholdName('');
      setShowCreateHousehold(false);

    } catch (err: any) {
      console.error('Error creating household:', err);
      setDashboardError('Failed to create household: ' + err.message); // Use dashboardError
    } finally {
      setIsCreatingHousehold(false);
    }
  };

  if (selectedHousehold) {
    // Ensure HouseholdDetail props are updated according to new data structures
    return <HouseholdDetail householdId={selectedHousehold} onBack={() => setSelectedHousehold(null)} />;
  }
  
  if (loadingHouseholds) {
    return (
      <Layout>
        <div className="text-center py-12">Loading households...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
          {dashboardError && !showCreateHousehold && <div className="text-red-500 p-3 bg-red-100 rounded-md mb-4">{dashboardError}</div>}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Your Households</h2>
          <button
              onClick={() => { setShowCreateHousehold(true); setDashboardError(null); }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Household
          </button>
        </div>

        {households.length === 0 && !loadingHouseholds ? (
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
                    {/* 
                      memberCount is not directly available. 
                      Could display created_at or fetch member count separately if needed.
                      For now, let's display created_at date for simplicity.
                    */}
                    <p className="mt-1 text-sm text-gray-500">
                      Created on: {new Date(household.created_at).toLocaleDateString()}
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
              {dashboardError && showCreateHousehold && <div className="text-red-500 p-2 bg-red-100 rounded-md mb-3">{dashboardError}</div>}
              <input
                type="text"
                placeholder="Household name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={newHouseholdName}
                onChange={(e) => setNewHouseholdName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateHousehold()}
              />
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => { setShowCreateHousehold(false); setDashboardError(null); }}
                  disabled={isCreatingHousehold}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateHousehold}
                  disabled={isCreatingHousehold}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isCreatingHousehold ? 'Creating...' : 'Create'}
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
  const { user: currentUser } = useAuth(); // Get current authenticated user
  const [activeTab, setActiveTab] = useState<'expenses' | 'members' | 'tasks'>('expenses');
  
  // Add new state for members
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [errorMembers, setErrorMembers] = useState<string | null>(null);

  // Fetch members and their profiles
  useEffect(() => {
    const fetchMembers = async () => {
      if (!householdId) return;
      setLoadingMembers(true);
      setErrorMembers(null);
      try {
        const { data, error } = await supabase
          .from('household_members')
          .select('*, profiles(name, avatar_url)') // Fetch related profile
          .eq('household_id', householdId);

        if (error) throw error;
        
        const fetchedMembers = (data || []).map(m => ({
          ...m,
          user_name: m.profiles?.name,
          user_avatar_url: m.profiles?.avatar_url
        })) as HouseholdMember[];
        setMembers(fetchedMembers);

      } catch (err: any) {
        console.error('Error fetching members:', err);
        setErrorMembers('Failed to fetch members: ' + err.message);
      } finally {
        setLoadingMembers(false);
      }
    };
    // Fetch members whenever householdId changes, or if the members tab is active
    // to ensure data is fresh if user navigates back and forth.
    if (householdId) {
      fetchMembers();
    }
  }, [householdId]);
  
  // Add new state for expenses
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [errorExpenses, setErrorExpenses] = useState<string | null>(null);

  // Fetch expenses and their splits
  useEffect(() => {
    const fetchExpenses = async () => {
      if (!householdId) return;
      setLoadingExpenses(true);
      setErrorExpenses(null);
      try {
        const { data, error } = await supabase
          .from('expenses')
          .select('*, expense_splits(*)') // Embed splits
          .eq('household_id', householdId)
          .order('date', { ascending: false });

        if (error) throw error;
        
        // Basic mapping, ideally enrich with user names later
        const fetchedExpenses = data.map(exp => ({
          ...exp,
          // Ensure expense_splits is always an array
          expense_splits: exp.expense_splits || [], 
        })) as Expense[];

        // TODO: Enrich expenses with paid_by_user_name and splits with user_name
        // This requires fetching profiles based on IDs. This can be a follow-up optimization
        // or done when members list is fully available.
        setExpenses(fetchedExpenses);

      } catch (err: any) {
        console.error('Error fetching expenses:', err);
        setErrorExpenses('Failed to fetch expenses: ' + err.message);
      } finally {
        setLoadingExpenses(false);
      }
    };
    fetchExpenses();
  }, [householdId]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [errorTasks, setErrorTasks] = useState<string | null>(null);

  // Fetch tasks (depends on householdId and activeTab)
  useEffect(() => {
    const fetchTasks = async () => {
      if (!householdId) return;
      setLoadingTasks(true);
      setErrorTasks(null);
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('household_id', householdId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        const enrichedTasks = (data || []).map(task => {
          const assignedMember = members.find(m => m.user_id === task.assigned_to);
          return {
            ...task,
            assigned_to_user_name: assignedMember?.user_name || task.assigned_to,
          };
        });
        setTasks(enrichedTasks);

      } catch (err: any) {
        console.error('Error fetching tasks:', err);
        setErrorTasks('Failed to fetch tasks: ' + err.message);
      } finally {
        setLoadingTasks(false);
      }
    };

    if (householdId && (activeTab === 'tasks' || tasks.length === 0)) {
      if (members.length > 0 || activeTab === 'tasks') { // Ensure members are loaded or tab is active
         fetchTasks();
      }
    }
  }, [householdId, activeTab, members]); // Add members as dependency for enrichment


  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);

  // Calculate balances
  const calculateBalances = (): Balance[] => {
    const balanceMap = new Map<string, number>();
    // Ensure members are populated before calculating balances
    if (members && members.length > 0) {
      members.forEach(m => balanceMap.set(m.user_id, 0));

      expenses.forEach(expense => {
        // Add what the payer is owed
        const payerBalance = balanceMap.get(expense.paid_by) || 0;
        balanceMap.set(expense.paid_by, payerBalance + expense.amount);
  
        // Subtract what each person owes
        expense.expense_splits.forEach(split => {
          if (!split.settled) {
            const currentBalance = balanceMap.get(split.user_id) || 0;
            balanceMap.set(split.user_id, currentBalance - split.amount);
          }
        });
      });

      return Array.from(balanceMap.entries()).map(([userId, balance]) => {
        const memberProfile = members.find(m => m.user_id === userId);
        return {
          userId,
          user: { 
            id: userId, 
            name: memberProfile?.user_name || memberProfile?.profiles?.name || 'Unknown User',
            avatarUrl: memberProfile?.user_avatar_url || memberProfile?.profiles?.avatar_url
          },
          balance,
        };
      });
    }
    return []; // Return empty if no members
  };

  const balances = calculateBalances();

  // Inside AddExpenseModal component defined within HouseholdDetail:
  const AddExpenseModal = () => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [paidBy, setPaidBy] = useState(currentUser?.id || ''); 
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [addExpenseError, setAddExpenseError] = useState<string | null>(null);
    const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

    useEffect(() => {
      if (currentUser && members.length > 0 && !members.find(m => m.user_id === currentUser.id)) {
        if (members.length > 0 && (!paidBy || !members.find(m => m.user_id === paidBy)) ) setPaidBy(members[0].user_id);
      } else if (currentUser && !paidBy) {
         setPaidBy(currentUser.id);
      }
    }, [currentUser, members, paidBy]);


    const handleSubmit = async () => {
      if (!description || !amount || !paidBy || !date) {
        setAddExpenseError('Please fill all fields.');
        return;
      }
      setAddExpenseError(null);
      setIsSubmittingExpense(true);
      try {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          setAddExpenseError('Invalid amount.');
          setIsSubmittingExpense(false);
          return;
        }

        // Call the Supabase RPC function
        const { data: newExpenseId, error: rpcError } = await supabase.rpc('create_expense_with_splits', {
          p_household_id: householdId,
          p_description: description,
          p_amount: parsedAmount,
          p_paid_by: paidBy, // This should be the UUID of the user who paid
          p_date: date,
        });

        if (rpcError) throw rpcError;

        // Success: close modal, refresh expenses
        // A simple way to refresh is to re-fetch all expenses.
        // More optimized: if RPC returns the new expense, add it to state.
        // For now, re-fetching is simpler to implement.
        setShowAddExpense(false); // Assuming setShowAddExpense controls modal visibility
        setLoadingExpenses(true); // Trigger loading state for feedback
        // Re-fetch (or you can try to append if the RPC returned the full expense object)
        const { data: refreshedExpensesData, error: fetchError } = await supabase
          .from('expenses')
          .select('*, expense_splits(*)')
          .eq('household_id', householdId)
          .order('date', { ascending: false });
        
        if (fetchError) throw fetchError;
        setExpenses(refreshedExpensesData.map(exp => ({ ...exp, expense_splits: exp.expense_splits || [] })) as Expense[]);
        setShowAddExpense(false); // Close modal on success
        setDescription(''); setAmount(''); // Reset form
      } catch (err: any) {
        console.error('Error adding expense:', err);
        setAddExpenseError('Failed to add expense: ' + err.message);
      } finally {
         setIsSubmittingExpense(false);
         // setLoadingExpenses(false); // This might be too broad if only one expense is being added
      }
    };
    
    // Return JSX for AddExpenseModal
    // Ensure the 'Paid by' select uses 'members' state.
    // Example for Paid by select:
    // <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
    //   {members.map(member => (
    //    <option key={member.user_id} value={member.user_id}>{member.user?.name || member.user_id}</option>
    //   ))}
    // </select>
    // Also add a date input:
    // <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
    
    // This is a simplified version of the modal. The full JSX is already in RoomiesApp.tsx.
    // The main change is the handleSubmit logic and adding a date field.
    // The worker should adapt the existing modal's handleSubmit.
    return (
      // ... Modal JSX ...
      // Ensure there's an input for date:
      // <div>
      //   <label className="block text-sm font-medium text-gray-700">Date</label>
      //   <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md ..."/>
      // </div>
      // Ensure the "Paid by" select is populated (even if with current user only for now):
      // <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="mt-1 w-full ...">
      //    <option value={user?.id}>{user?.name || 'You'}</option>
      //    {/* Populate with other members once members list is available */}
      // </select>
      // ... rest of the modal JSX ...
      // The existing modal structure should be largely preserved, just updating the state and submit logic.
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Expense</h3>
          {addExpenseError && <div className="text-red-500 p-2 bg-red-100 rounded-md mb-3">{addExpenseError}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Paid by</label>
              <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md">
                {members.map(member => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user_name || member.profiles?.name || member.user_id}
                  </option>
                ))}
                {!members.find(m => m.user_id === currentUser?.id) && currentUser && (
                   <option value={currentUser.id}>{currentUser.name || 'You (Not in member list yet)'}</option>
                )}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button onClick={() => {setShowAddExpense(false); setAddExpenseError(null);}} disabled={isSubmittingExpense} className="px-4 py-2 text-sm font-medium disabled:opacity-50">Cancel</button>
            <button onClick={handleSubmit} disabled={isSubmittingExpense} className="px-4 py-2 border text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
              {isSubmittingExpense ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Inside AddTaskModal component defined within HouseholdDetail:
  const AddTaskModal = () => {
    const [title, setTitle] = useState('');
    const [assignedTo, setAssignedTo] = useState<string | undefined>(undefined);
    const [addTaskError, setAddTaskError] = useState<string | null>(null);
    const [isSubmittingTask, setIsSubmittingTask] = useState(false);

    const handleSubmit = async () => {
      if (!title.trim()) {
        setAddTaskError('Task title is required.');
        return;
      }
      setAddTaskError(null);
      setIsSubmittingTask(true);
      try {
        const newTaskData: Partial<Task> = {
          household_id: householdId,
          title: title.trim(),
          completed: false,
          assigned_to: assignedTo || null, // Ensure it's null if undefined
        };

        const { data: newTask, error } = await supabase
          .from('tasks')
          .insert(newTaskData)
          .select()
          .single();

        if (error) throw error;
        if (!newTask) throw new Error("Task creation failed, no data returned.");

        setTasks(prevTasks => [newTask as Task, ...prevTasks]);
        setShowAddTask(false); 
        setTitle('');
        setAssignedTo(undefined);
      } catch (err: any) {
        console.error('Error adding task:', err);
        setAddTaskError('Failed to add task: ' + err.message);
      } finally {
        setIsSubmittingTask(false);
      }
    };
    
    // Return JSX for AddTaskModal
    // Ensure "Assign to" select uses 'members' state.
    // For now, it might be empty or simplified.
    // Example for Assign to select:
    // <select value={assignedTo || ''} onChange={(e) => setAssignedTo(e.target.value || undefined)}>
    //   <option value="">Unassigned</option>
    //   {members.map(member => (
    //    <option key={member.user_id} value={member.user_id}>{member.user?.name || member.user_id}</option>
    //   ))}
    // </select>
    // This is a simplified version. The worker should adapt the existing modal.
    return (
       <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Task</h3>
          {addTaskError && <div className="text-red-500 p-2 bg-red-100 rounded-md mb-3">{addTaskError}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Task</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Assign to (optional)</label>
              <select value={assignedTo || ''} onChange={(e) => setAssignedTo(e.target.value || undefined)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="">Unassigned</option>
                {members.map(member => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user_name || member.profiles?.name || member.user_id}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button onClick={() => {setShowAddTask(false); setAddTaskError(null);}} disabled={isSubmittingTask} className="px-4 py-2 text-sm font-medium disabled:opacity-50">Cancel</button>
            <button onClick={handleSubmit} disabled={isSubmittingTask} className="px-4 py-2 border text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
              {isSubmittingTask ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const InviteMemberModal = () => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);


    const handleSubmit = async () => {
      if (!email.trim() || !currentUser) {
        setInviteError('Email is required.');
        return;
      }
      setIsSubmitting(true);
      setInviteError(null);
      try {
        const { error } = await supabase.from('invitations').insert({
          household_id: householdId,
          invited_by: currentUser.id,
          email: email.trim(),
          status: 'pending', // Default status
        });

        if (error) throw error;

        alert(`Invitation sent to ${email}`); // Replace with better notification
        setShowInviteMember(false); // Assuming setShowInviteMember controls modal visibility
        setEmail('');
      } catch (err: any) {
        console.error('Error sending invitation:', err);
        setInviteError('Failed to send invitation: ' + err.message);
      } finally {
        setIsSubmitting(false);
      }
    };
    
    // Return JSX for InviteMemberModal
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Member</h3>
          {inviteError && <p className="text-red-500 text-sm mb-2">{inviteError}</p>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="roommate@example.com" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button onClick={() => setShowInviteMember(false)} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium">Cancel</button>
            <button onClick={handleSubmit} disabled={isSubmitting} className="px-4 py-2 border text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
              {isSubmitting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Update the `markExpenseSettled` function
  // Function to toggle task completion
  const handleToggleTaskCompletion = async (taskToToggle: Task) => {
    setErrorTasks(null);
    try {
      const newCompletedStatus = !taskToToggle.completed;
      const { data: updatedTask, error } = await supabase
        .from('tasks')
        .update({
          completed: newCompletedStatus,
          completed_at: newCompletedStatus ? new Date().toISOString() : null,
        })
        .eq('id', taskToToggle.id)
        .select()
        .single();

      if (error) throw error;
      if (!updatedTask) throw new Error("Task update failed, no data returned.");

      setTasks(prevTasks =>
        prevTasks.map(task => (task.id === updatedTask.id ? updatedTask as Task : task))
      );
    } catch (err: any) {
      console.error('Error toggling task completion:', err);
      setErrorTasks('Failed to update task: ' + err.message); // Display this error
    }
  };
  
  return (
    <Layout title="Beach House" showBack onBack={onBack}>
      <div className="space-y-6">
        {/* Balance Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Balance Summary</h3>
          <div className="space-y-2">
            {balances.map(balance => (
              <div key={balance.userId} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{balance.user.name}</span>
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
            {loadingExpenses && <p>Loading expenses...</p>}
            {errorExpenses && <div className="text-red-500 p-3 bg-red-100 rounded-md">{errorExpenses}</div>}
            {!loadingExpenses && !errorExpenses && (
              <div className="space-y-3">
                {expenses.map(expense => (
                  <div key={expense.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{expense.description}</h4>
                        <p className="text-sm text-gray-500">
                          Paid by {members.find(m=>m.user_id === expense.paid_by)?.user_name || expense.paid_by} • {new Date(expense.date).toLocaleDateString()}
                        </p>
                        
                        <div className="mt-2 space-y-1">
                          {expense.expense_splits.filter(split => split.user_id !== expense.paid_by && !split.settled).map(split => (
                            <div key={split.id} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{members.find(m=>m.user_id === split.user_id)?.user_name || split.user_id} owes</span>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">${split.amount.toFixed(2)}</span>
                                <button
                                  onClick={() => markExpenseSettled(expense.id, split.user_id)} // markExpenseSettled needs to be defined or updated
                                  className="text-xs text-blue-600 hover:text-blue-500"
                                >
                                  Mark paid
                                </button>
                              </div>
                            </div>
                          ))}
                           {expense.expense_splits.filter(split => split.settled).map(split => (
                            <div key={split.id} className="flex items-center justify-between text-sm text-gray-400">
                              <span>{members.find(m=>m.user_id === split.user_id)?.user_name || split.user_id} paid ${split.amount.toFixed(2)}</span>
                              <span>(Settled)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-medium text-gray-900">${expense.amount.toFixed(2)}</p>
                        {members && members.length > 0 && expense.expense_splits.length > 0 && (
                           <p className="text-xs text-gray-500">
                             ${(expense.amount / expense.expense_splits.length).toFixed(2)} each
                           </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {expenses.length === 0 && <p className="text-gray-500">No expenses yet. Add one to get started!</p>}
              </div>
            )}
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
            {loadingMembers && <p>Loading members...</p>}
            {errorMembers && <div className="text-red-500 p-3 bg-red-100 rounded-md">{errorMembers}</div>}
            {!loadingMembers && !errorMembers && (
              <div className="space-y-3">
                {members.map(member => (
                  <div key={member.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      {member.user_avatar_url ? (
                        <img src={member.user_avatar_url} alt={member.user_name} className="h-10 w-10 rounded-full" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <LucideUserIcon className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{member.user_name || member.profiles?.name || member.user_id}</p>
                        <p className="text-sm text-gray-500">Role: {member.role}</p>
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
            {loadingTasks && <p>Loading tasks...</p>}
            {errorTasks && <div className="text-red-500 p-3 bg-red-100 rounded-md">{errorTasks}</div>}
            {!loadingTasks && !errorTasks && (
              <>
                <div className="space-y-3">
                  {tasks.filter(t => !t.completed).map(task => (
                    <div key={task.id} className={`p-4 rounded-lg shadow bg-white`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <button onClick={() => handleToggleTaskCompletion(task)} className="flex-shrink-0">
                            <div className="h-5 w-5 rounded border-2 border-gray-300 hover:border-gray-400" />
                          </button>
                          <p className={`ml-3 text-gray-900`}>{task.title}</p>
                        </div>
                        {task.assigned_to && <span className="text-sm text-gray-500">Assigned to: {members.find(m=>m.user_id === task.assigned_to)?.user_name || task.assigned_to}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                
                {tasks.filter(t => t.completed).length > 0 && (
                  <>
                    <h4 className="text-sm font-medium text-gray-500 mt-6">Completed</h4>
                    {tasks.filter(t => t.completed).map(task => (
                       <div key={task.id} className={`p-4 rounded-lg shadow bg-gray-50`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <button onClick={() => handleToggleTaskCompletion(task)} className="flex-shrink-0">
                              <Check className="h-5 w-5 text-green-500" />
                            </button>
                            <p className={`ml-3 line-through text-gray-500`}>{task.title}</p>
                          </div>
                          {task.assigned_to && <span className="text-sm text-gray-500">Assigned to: {members.find(m=>m.user_id === task.assigned_to)?.user_name || task.assigned_to}</span>}
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {tasks.length === 0 && <p className="text-gray-500">No tasks yet. Add one to get started!</p>}
              </>
            )}
          </div>
        )}
      </div>

      {showAddExpense && <AddExpenseModal />}
      {showAddTask && <AddTaskModal />}
      {showInviteMember && <InviteMemberModal />}
    </Layout>
  );
};

// Main App Component
const App: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
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