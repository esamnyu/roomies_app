
"use client";
import React, { useState, useContext, createContext, useEffect } from 'react';
import { ChevronRight, Home, Users, DollarSign, CheckSquare, Plus, UserPlus, LogOut, Menu, X, ArrowLeft, Check, Calendar, User } from 'lucide-react';

// Types
interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

interface Household {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
}

interface HouseholdMember {
  id: string;
  userId: string;
  householdId: string;
  user: User;
  joinedAt: string;
}

interface Expense {
  id: string;
  householdId: string;
  description: string;
  amount: number;
  paidBy: string;
  paidByUser: User;
  date: string;
  settled: boolean;
  splits: ExpenseSplit[];
}

interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
  settled: boolean;
  user: User;
}

interface Task {
  id: string;
  householdId: string;
  title: string;
  assignedTo?: string;
  assignedToUser?: User;
  completed: boolean;
  createdAt: string;
}

interface Balance {
  userId: string;
  user: User;
  balance: number; // positive = owed to them, negative = they owe
}

// Auth Context
const AuthContext = createContext<{
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}>({
  user: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  loading: true,
});

// Auth Provider
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for existing session
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Simulate API call
    const mockUser: User = {
      id: '1',
      email,
      name: email.split('@')[0],
    };
    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
  };

  const register = async (email: string, password: string, name: string) => {
    // Simulate API call
    const mockUser: User = {
      id: Date.now().toString(),
      email,
      name,
    };
    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
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
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = async () => {
    try {
      if (isRegistering) {
        await login(email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError('Invalid credentials');
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

// Dashboard
const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([
    {
      id: '1',
      name: 'Beach House',
      createdAt: '2024-01-15',
      memberCount: 3,
    },
    {
      id: '2',
      name: 'City Apartment',
      createdAt: '2024-02-20',
      memberCount: 2,
    },
  ]);
  const [showCreateHousehold, setShowCreateHousehold] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [selectedHousehold, setSelectedHousehold] = useState<string | null>(null);

  const createHousehold = () => {
    if (newHouseholdName.trim()) {
      const newHousehold: Household = {
        id: Date.now().toString(),
        name: newHouseholdName,
        createdAt: new Date().toISOString(),
        memberCount: 1,
      };
      setHouseholds([...households, newHousehold]);
      setNewHouseholdName('');
      setShowCreateHousehold(false);
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

        {households.length === 0 ? (
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
                >
                  Cancel
                </button>
                <button
                  onClick={createHousehold}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create
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
  const [activeTab, setActiveTab] = useState<'expenses' | 'members' | 'tasks'>('expenses');
  const [members] = useState<HouseholdMember[]>([
    {
      id: '1',
      userId: '1',
      householdId,
      user: { id: '1', email: 'john@example.com', name: 'John' },
      joinedAt: '2024-01-15',
    },
    {
      id: '2',
      userId: '2',
      householdId,
      user: { id: '2', email: 'sarah@example.com', name: 'Sarah' },
      joinedAt: '2024-01-16',
    },
    {
      id: '3',
      userId: '3',
      householdId,
      user: { id: '3', email: 'mike@example.com', name: 'Mike' },
      joinedAt: '2024-01-17',
    },
  ]);

  const [expenses, setExpenses] = useState<Expense[]>([
    {
      id: '1',
      householdId,
      description: 'Groceries',
      amount: 120.50,
      paidBy: '1',
      paidByUser: members[0].user,
      date: '2024-03-20',
      settled: false,
      splits: members.map((m, i) => ({
        id: `split-1-${i}`,
        expenseId: '1',
        userId: m.userId,
        amount: 40.17,
        settled: i === 0,
        user: m.user,
      })),
    },
    {
      id: '2',
      householdId,
      description: 'Internet Bill',
      amount: 60,
      paidBy: '2',
      paidByUser: members[1].user,
      date: '2024-03-15',
      settled: false,
      splits: members.map((m, i) => ({
        id: `split-2-${i}`,
        expenseId: '2',
        userId: m.userId,
        amount: 20,
        settled: i === 1,
        user: m.user,
      })),
    },
  ]);

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      householdId,
      title: 'Clean kitchen',
      assignedTo: '1',
      assignedToUser: members[0].user,
      completed: false,
      createdAt: '2024-03-20',
    },
    {
      id: '2',
      householdId,
      title: 'Take out trash',
      assignedTo: '2',
      assignedToUser: members[1].user,
      completed: true,
      createdAt: '2024-03-19',
    },
  ]);

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);

  // Calculate balances
  const calculateBalances = (): Balance[] => {
    const balanceMap = new Map<string, number>();
    
    members.forEach(m => balanceMap.set(m.userId, 0));

    expenses.forEach(expense => {
      // Add what the payer is owed
      const payerBalance = balanceMap.get(expense.paidBy) || 0;
      balanceMap.set(expense.paidBy, payerBalance + expense.amount);

      // Subtract what each person owes
      expense.splits.forEach(split => {
        if (!split.settled) {
          const currentBalance = balanceMap.get(split.userId) || 0;
          balanceMap.set(split.userId, currentBalance - split.amount);
        }
      });
    });

    return Array.from(balanceMap.entries()).map(([userId, balance]) => ({
      userId,
      user: members.find(m => m.userId === userId)!.user,
      balance,
    }));
  };

  const balances = calculateBalances();

  const AddExpenseModal = () => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [paidBy, setPaidBy] = useState(user?.id || '1');

    const handleSubmit = () => {
      if (description && amount) {
        const newExpense: Expense = {
          id: Date.now().toString(),
          householdId,
          description,
          amount: parseFloat(amount),
          paidBy,
          paidByUser: members.find(m => m.userId === paidBy)!.user,
          date: new Date().toISOString().split('T')[0],
          settled: false,
          splits: members.map((m) => ({
            id: `split-${Date.now()}-${m.userId}`,
            expenseId: Date.now().toString(),
            userId: m.userId,
            amount: parseFloat(amount) / members.length,
            settled: m.userId === paidBy,
            user: m.user,
          })),
        };
        setExpenses([newExpense, ...expenses]);
        setShowAddExpense(false);
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
            <div>
              <label className="block text-sm font-medium text-gray-700">Paid by</label>
              <select
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
              >
                {members.map(member => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setShowAddExpense(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Add Expense
            </button>
          </div>
        </div>
      </div>
    );
  };

  const AddTaskModal = () => {
    const [title, setTitle] = useState('');
    const [assignedTo, setAssignedTo] = useState('');

    const handleSubmit = () => {
      if (title) {
        const newTask: Task = {
          id: Date.now().toString(),
          householdId,
          title,
          assignedTo: assignedTo || undefined,
          assignedToUser: assignedTo ? members.find(m => m.userId === assignedTo)?.user : undefined,
          completed: false,
          createdAt: new Date().toISOString(),
        };
        setTasks([newTask, ...tasks]);
        setShowAddTask(false);
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
                  <option key={member.userId} value={member.userId}>
                    {member.user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setShowAddTask(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Add Task
            </button>
          </div>
        </div>
      </div>
    );
  };

  const InviteMemberModal = () => {
    const [email, setEmail] = useState('');

    const handleSubmit = () => {
      if (email) {
        // In a real app, this would send an invitation
        alert(`Invitation sent to ${email}`);
        setShowInviteMember(false);
        setEmail('');
      }
    };

    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Member</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <input
                type="email"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="roommate@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setShowInviteMember(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Send Invite
            </button>
          </div>
        </div>
      </div>
    );
  };

  const markExpenseSettled = (expenseId: string, userId: string) => {
    setExpenses(expenses.map(expense => {
      if (expense.id === expenseId) {
        return {
          ...expense,
          splits: expense.splits.map(split => 
            split.userId === userId ? { ...split, settled: true } : split
          )
        };
      }
      return expense;
    }));
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
            <div className="space-y-3">
              {expenses.map(expense => (
                <div key={expense.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{expense.description}</h4>
                      <p className="text-sm text-gray-500">
                        Paid by {expense.paidByUser.name} • {expense.date}
                      </p>
                      
                      {/* Show who owes what */}
                      <div className="mt-2 space-y-1">
                        {expense.splits.filter(split => split.userId !== expense.paidBy && !split.settled).map(split => (
                          <div key={split.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{split.user.name} owes</span>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">${split.amount.toFixed(2)}</span>
                              <button
                                onClick={() => markExpenseSettled(expense.id, split.userId)}
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
              ))}
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
                        <p className="font-medium text-gray-900">{member.user.name}</p>
                        <p className="text-sm text-gray-500">{member.user.email}</p>
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
              {tasks.filter(t => !t.completed).map(task => (
                <div key={task.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <button
                        onClick={() => {
                          setTasks(tasks.map(t => 
                            t.id === task.id ? { ...t, completed: true } : t
                          ));
                        }}
                        className="flex-shrink-0"
                      >
                        <div className="h-5 w-5 rounded border-2 border-gray-300 hover:border-gray-400" />
                      </button>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{task.title}</p>
                        {task.assignedToUser && (
                          <p className="text-sm text-gray-500">Assigned to {task.assignedToUser.name}</p>
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
            </div>
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