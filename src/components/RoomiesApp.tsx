// src/components/RoomiesApp.tsx
// Main application component that handles routing, authentication state, and top-level app navigation
"use client";


import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// Navigation icons
import { ChevronRight, Home } from 'lucide-react';
// Feature icons
import { DollarSign, CheckSquare, MessageSquare, ClipboardList, CreditCard } from 'lucide-react';
// Action icons
import { Plus, Edit3, Trash2, Pencil, CheckCircle2 } from 'lucide-react';
// User/Contact icons
import { User, Share2, LifeBuoy } from 'lucide-react';
// Status icons
import { Loader2 } from 'lucide-react';

import { 
  joinHouseholdWithCode, 
  getHouseholdDetails, 
  getUserHouseholds, 
  addHouseRule, 
  updateHouseRule, 
  deleteHouseRule, 
  getHouseholdData
} from '../lib/api/households';
import { getHouseholdRecurringExpenses } from '../lib/api/expenses';
import { getHouseholdBalances, getSettlementSuggestions } from '../lib/api/settlements';
import { Household, HouseholdMember, Expense, RecurringExpense, HouseRule, Profile } from '../lib/types/types';

import { AuthProvider, useAuth } from './AuthProvider';
import { toast } from 'react-hot-toast';

// Component Imports
import { LandingPageContent } from './LandingPageContent';
import { HouseholdSetupForm } from './HouseholdSetupForm';
import { OnboardingChoice } from './OnboardingChoice';
import HouseholdChat from './HouseholdChat';
import { ChoreDashboard } from './ChoreDashboard';
import { AddExpenseModal } from './modals/AddExpenseModal';
import { AddRecurringExpenseModal } from './modals/AddRecurringExpenseModal';
import { SettleUpModal } from './modals/SettleUpModal';
import { ManageJoinCodeModal } from './modals/ManageJoinCodeModal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { ProfileModal } from './modals/ProfileModal';
import { HouseholdSettingsModal } from './modals/HouseholdSettingsModal';
import { EditExpenseModal } from './modals/EditExpenseModal';
import { AuthForm } from './AuthForm';
import { Layout } from './Layout';



// --- START: SHARED & HELPER COMPONENTS ---

/**
 * Reusable loading spinner component for full-screen loading states
 */
const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-4 min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
);


/**
 * Component for joining an existing household using a 4-character invite code
 */
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
            const household = await joinHouseholdWithCode(joinCode);
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
        <div className="max-w-md mx-auto bg-background p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Enter Join Code</h2>
            <p className="text-secondary-foreground mb-4 text-center">Ask a member of the household for the 4-character join code.</p>
            <div className="space-y-4">
                <div>
                    <label htmlFor="joinCode" className="block text-sm font-medium text-foreground">4-Character Code</label>
                    <Input type="text" id="joinCode" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().trim())} maxLength={4} className="mt-1 uppercase tracking-widest text-center" placeholder="XYZ1" autoCapitalize="characters" autoComplete="off" spellCheck="false" />
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
    );
};

/**
 * Welcome screen shown after successfully joining or creating a household
 */
const HouseholdWelcomeDisplay: React.FC<{ householdId: string; householdName?: string; onProceed: () => void }> = ({ householdId, householdName, onProceed }) => {
    const [fetchedHouseholdName, setFetchedHouseholdName] = useState(householdName);
    const [loading, setLoading] = useState(!householdName);

    useEffect(() => {
        if (!householdName && householdId) {
            setLoading(true);
            getHouseholdDetails(householdId)
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


/**
 * Main dashboard showing user's households list with navigation to create/join households
 */
const Dashboard: React.FC<{ setAppState: (state: AppState) => void }> = ({ setAppState }) => {
    const { user } = useAuth();
    const [households, setHouseholds] = useState<Household[]>([]);
    const [loadingHouseholds, setLoadingHouseholds] = useState(true);
    const [selectedHousehold, setSelectedHousehold] = useState<string | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    const loadHouseholds = useCallback(async () => {
        try {
            setLoadingHouseholds(true);
            const data = await getUserHouseholds();
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
        <Layout title={"My Households"} isHouseholdView={false} onShowProfile={()=>setIsProfileModalOpen(true)}>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-foreground">Your Households</h2>
                    <div className="flex items-center space-x-3">
                        <Button onClick={() => setAppState('joinWithCode')} variant="secondary">
                            Join Household
                        </Button>
                        <Button onClick={() => setAppState('householdSetup')}>
                            <Plus className="h-4 w-4 mr-2" /> New Household
                        </Button>
                    </div>
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
            {user && isProfileModalOpen && <ProfileModal user={user} onClose={()=>setIsProfileModalOpen(false)} onUpdate={()=>{}} />}
        </Layout>
    );
};


// Tab types for the household detail view navigation
type HouseholdDetailTab = 'money' | 'structuredChores' | 'communication' | 'rules';


/**
 * Modal for adding new house rules to a household
 */
const AddRuleModal: React.FC<{
    householdId: string;
    onClose: () => void;
    onRuleAdded: () => void;
}> = ({ householdId, onClose, onRuleAdded }) => {
    const [category, setCategory] = useState('');
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async () => {
        if (!category.trim() || !content.trim()) {
            toast.error("Both category and content are required.");
            return;
        }
        setIsSaving(true);
        try {
            await addHouseRule(householdId, category.trim(), content.trim());
            toast.success("New rule added!");
            onRuleAdded();
        } catch (error) {
            toast.error("Failed to add rule: " + (error instanceof Error ? error.message : ""));
        } finally {
            setIsSaving(false);
        }
    };

    const textareaStyles = "mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-medium text-foreground mb-4">Add a New House Rule</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-foreground">Category</label>
                        <Input type="text" id="category" value={category} onChange={e => setCategory(e.target.value)} className="mt-1" placeholder="e.g., Cleanliness, Guests" />
                    </div>
                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-foreground">Rule Content</label>
                        <textarea id="content" value={content} onChange={e => setContent(e.target.value)} className={textareaStyles} rows={3} placeholder="Describe the rule..."></textarea>
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button onClick={onClose} disabled={isSaving} variant="secondary">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSaving || !category || !content}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Rule'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

/**
 * Modal for editing existing house rules
 */
const EditRuleModal: React.FC<{
    householdId: string;
    rule: HouseRule;
    onClose: () => void;
    onRuleUpdated: () => void;
}> = ({ householdId, rule, onClose, onRuleUpdated }) => {
    const [category, setCategory] = useState(rule.category);
    const [content, setContent] = useState(rule.content);
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async () => {
        if (!category.trim() || !content.trim()) {
            toast.error("Both category and content are required.");
            return;
        }
        setIsSaving(true);
        try {
            await updateHouseRule(householdId, { ...rule, category, content });
            toast.success("Rule updated!");
            onRuleUpdated();
        } catch (error) {
            toast.error("Failed to update rule: " + (error instanceof Error ? error.message : ""));
        } finally {
            setIsSaving(false);
        }
    };

    const textareaStyles = "mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-medium text-foreground mb-4">Edit House Rule</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="edit-category" className="block text-sm font-medium text-foreground">Category</label>
                        <Input type="text" id="edit-category" value={category} onChange={e => setCategory(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                        <label htmlFor="edit-content" className="block text-sm font-medium text-foreground">Rule Content</label>
                        <textarea id="edit-content" value={content} onChange={e => setContent(e.target.value)} className={textareaStyles} rows={3}></textarea>
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button onClick={onClose} disabled={isSaving} variant="secondary">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSaving || !category || !content}>
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

/**
 * Individual rule card component with edit/delete controls for admins
 */
const RuleCard: React.FC<{
    rule: HouseRule;
    isAdmin: boolean;
    onEdit: (rule: HouseRule) => void;
    onDelete: (ruleId: string) => void;
}> = ({ rule, isAdmin, onEdit, onDelete }) => {
    return (
        <div className="bg-secondary p-4 rounded-lg border border-border">
            <div className="flex justify-between items-center">
                <h4 className="text-md font-semibold text-foreground">{rule.category}</h4>
                {isAdmin && (
                    <div className="flex space-x-2">
                        <button onClick={() => onEdit(rule)} className="text-secondary-foreground hover:text-primary" title="Edit Rule">
                            <Edit3 className="h-4 w-4" />
                        </button>
                        <button onClick={() => onDelete(rule.id)} className="text-secondary-foreground hover:text-destructive" title="Delete Rule">
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
            <p className="mt-2 text-sm text-secondary-foreground whitespace-pre-wrap">{rule.content}</p>
        </div>
    );
};


/**
 * Main household detail view with tabs for money, chores, communication, and rules
 * Handles complex state management for household data and modal interactions
 */
const HouseholdDetail: React.FC<{ householdId: string; onBack: () => void }> = ({ householdId, onBack }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<HouseholdDetailTab>('money');
    const [household, setHousehold] = useState<Household | null>(null);
    const [members, setMembers] = useState<HouseholdMember[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [balances, setBalances] = useState<Awaited<ReturnType<typeof getHouseholdBalances>>>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
    const [expandedExpense, setExpandedExpense] = useState<string | null>(null);

    const [showAddRecurring, setShowAddRecurring] = useState(false);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showManageJoinCode, setShowManageJoinCode] = useState(false);
    const [showSettleUp, setShowSettleUp] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isHouseholdSettingsModalOpen, setIsHouseholdSettingsModalOpen] = useState(false);
    const [showAddRuleModal, setShowAddRuleModal] = useState(false);
    const [showEditRuleModal, setShowEditRuleModal] = useState(false);
    const [ruleToEdit, setRuleToEdit] = useState<HouseRule | null>(null);

    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    

    const isLoadingRef = useRef(false);
    const isMountedRef = useRef(true);

    const isAdmin = useMemo(() => members.find(m => m.user_id === user?.id)?.role === 'admin', [members, user]);

    // Optimized data fetching with loading states and race condition protection
    const refreshData = useCallback(async (showToast = false) => {
        if (isLoadingRef.current || !isMountedRef.current) return;
        isLoadingRef.current = true;
        if (!showToast) setLoadingData(true);
        
        try {
            const [data, recurringData, balanceData] = await Promise.all([
                getHouseholdData(householdId),
                getHouseholdRecurringExpenses(householdId),
                getHouseholdBalances(householdId)
            ]);

            if (!isMountedRef.current) return;
            
            if (data.household) setHousehold(data.household);
            setMembers(data.members || []);
            setExpenses(data.recent_expenses || []);
            setRecurringExpenses(recurringData);
            setBalances(balanceData);

            if (showToast) toast.success("Data refreshed!");
        } catch (error) {
            console.error('Error loading household data:', error);
            if (isMountedRef.current) toast.error('Failed to load household data.');
        } finally {
            if (isMountedRef.current) setLoadingData(false);
            isLoadingRef.current = false;
        }
    }, [householdId]);

    useEffect(() => {
        isMountedRef.current = true;
        refreshData();
        return () => { isMountedRef.current = false; };
    }, [householdId, refreshData]);

    // Calculate intelligent settlement suggestions based on current balances
    const settlementSuggestions = useMemo(() => getSettlementSuggestions ? getSettlementSuggestions(balances) : [], [balances]);

    // Calculate the current user's overall balance for settlement UI logic
    const currentUserBalance = useMemo(() => {
        return balances.find(b => b.userId === user?.id)?.balance || 0;
    }, [balances, user]);

    if (loadingData && !household) {
            return (
                <Layout title="Loading Household..." showBack onBack={onBack} isHouseholdView={false}>
                    <LoadingSpinner />
                </Layout>
            );
    }

    // Extract profile data from household members for chat functionality
    const memberProfiles = members.map(m => m.profiles).filter((p): p is Profile => !!p);

    return (
        <Layout
            title={household?.name || 'Household Details'}
            showBack
            onBack={onBack}
            isHouseholdView={true}
            onShowProfile={() => setIsProfileModalOpen(true)}
            onShowSettings={() => setIsHouseholdSettingsModalOpen(true)}>
            <div className="space-y-6">
                <div className="border-b border-border">
                    <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
                        {(['money', 'structuredChores', 'communication', 'rules'] as HouseholdDetailTab[]).map(tab => ( // MODIFIED: Changed default tab
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`py-2 px-1 sm:px-3 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-secondary-foreground hover:text-foreground hover:border-border'}`}>
                                {tab === 'structuredChores' && <ClipboardList className="inline h-4 w-4 mr-1" />}
                                {tab === 'money' && <DollarSign className="inline h-4 w-4 mr-1" />}
                                {tab === 'communication' && <MessageSquare className="inline h-4 w-4 mr-1" />}
                                {tab === 'rules' && <LifeBuoy className="inline h-4 w-4 mr-1" />}
                                {tab === 'structuredChores' ? 'Chores' : tab === 'money' ? 'Money' : tab === 'communication' ? 'Communication' : 'Rules'}
                            </button>
                        ))}
                    </nav>
                </div>

                {activeTab === 'structuredChores' && householdId && <ChoreDashboard householdId={householdId} />}

                {activeTab === 'money' && (
                    <div className="space-y-6">
                        <div className="bg-background rounded-lg shadow p-6 border border-border">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-foreground">Balance Summary</h3>
                                <Button onClick={() => setShowSettleUp(true)} size="sm" disabled={currentUserBalance >= 0}>
                                    <CreditCard className="h-4 w-4 mr-1" />Settle Up
                                </Button>
                            </div>
                            {/* New Overall Summary for the current user */}
                            <div className="mb-4 text-center p-3 bg-secondary rounded-lg">
                                <p className="text-base text-secondary-foreground">
                                    {Math.abs(currentUserBalance) < 0.01 && "You are all settled up."}
                                    {currentUserBalance > 0.01 && `Overall, you are owed `}
                                    {currentUserBalance < -0.01 && `Overall, you owe `}
                                    {Math.abs(currentUserBalance) >= 0.01 &&
                                        <span className={`font-bold ${currentUserBalance > 0 ? 'text-primary' : 'text-destructive'}`}>
                                            ${Math.abs(currentUserBalance).toFixed(2)}
                                        </span>
                                    }
                                </p>
                            </div>
                            {/* Revamped Balances List */}
                            <div className="space-y-1">
                                {balances.length > 0 ? balances.map(balance => {
                                    if (Math.abs(balance.balance) < 0.01) {
                                        return (
                                                <div key={balance.userId} className="flex justify-between items-center text-sm text-secondary-foreground p-2">
                                                    <span>{balance.profile?.name} {balance.userId === user?.id && '(You)'}</span>
                                                    <span className="italic">is settled up</span>
                                                </div>
                                        );
                                    }

                                    const isOwed = balance.balance > 0;

                                    return (
                                        <div key={balance.userId} className={`flex justify-between items-center p-2 rounded-md text-sm ${balance.userId === user?.id ? 'bg-secondary' : ''}`}>
                                            <span className="font-medium text-foreground">{balance.profile?.name} {balance.userId === user?.id && '(You)'}</span>
                                            <div className={`font-medium ${isOwed ? 'text-primary' : 'text-destructive'}`}>
                        {isOwed ? 'gets back ' : 'owes '}
                        <span>
                            ${Math.abs(balance.balance).toFixed(2)}
                        </span>
                    </div>
                </div>
            );
        }) : <p className="text-sm text-secondary-foreground">No balances to show yet. Add some expenses!</p>}
    </div>
</div>
<div className="bg-secondary rounded-lg p-4">
    <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-medium text-foreground">Recurring Expenses</h4>
        <Button onClick={() => setShowAddRecurring(true)} variant="outline" size="sm"><Plus className="h-4 w-4 inline mr-1" />Add Recurring</Button>
    </div>
    {loadingData && recurringExpenses.length === 0 ? <LoadingSpinner/> : recurringExpenses.length === 0 ? <p className="text-sm text-secondary-foreground">No recurring expenses.</p> : (
        <div className="space-y-2">
            {recurringExpenses.map(rec => (
                <div key={rec.id} className="flex justify-between items-center text-sm p-2 bg-background rounded shadow-sm">
                    <div>
                        <span className="font-medium">{rec.description}</span>
                        <span className="text-secondary-foreground ml-2">
                            ${rec.amount.toFixed(2)} {rec.frequency}
                        </span>
                    </div>
                    <div className="text-secondary-foreground">
                        Next: {new Date(rec.next_due_date + (rec.next_due_date.includes('T') ? '' : 'T00:00:00')).toLocaleDateString()}
                    </div>
                </div>
            ))}
        </div>
    )}
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium text-foreground">One-Time Expenses</h3>
                                <Button onClick={() => setShowAddExpense(true)} size="sm">
                                    <Plus className="h-4 w-4 mr-1" />Add Expense
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {loadingData && expenses.length === 0 ? <LoadingSpinner/> : expenses.length === 0 ? <p className="text-secondary-foreground text-center py-4">No one-time expenses.</p> : ( 
                                    expenses.map(expense => (
                                        // MODIFIED: This whole block is new to handle collapsible expenses and display splits/adjustments
                                        <div key={expense.id} className="bg-background rounded-lg shadow border border-border overflow-hidden">
                                            <div 
                                                className="p-4 flex justify-between items-start cursor-pointer hover:bg-secondary/50"
                                                onClick={() => setExpandedExpense(expandedExpense === expense.id ? null : expense.id)}
                                            >
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-foreground">{expense.description}</h4>
                                                    <p className="text-sm text-secondary-foreground">Paid by {expense.profiles?.name} • {new Date(expense.date + (expense.date.includes('T') ? '' : 'T00:00:00')).toLocaleDateString()}</p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <p className="font-medium text-foreground text-right">${expense.amount.toFixed(2)}</p>
                                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingExpense(expense); }}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            {/* Collapsible content for splits */}
                                            {expandedExpense === expense.id && (
                                                <div className="px-4 pb-4 border-t border-border bg-secondary/30">
                                                    <h5 className="text-sm font-semibold text-foreground mt-3 mb-2">Splits</h5>
                                                    <div className="space-y-2">
                                                        {expense.expense_splits && expense.expense_splits.length > 0 ? expense.expense_splits.map(split => (
                                                            <div key={split.id} className="text-sm">
                                                                <div className="flex justify-between items-center">
                                                                    <div className="flex items-center">
                                                                        {split.settled ? (
                                                                            <><CheckCircle2 className="h-4 w-4 text-primary mr-2" /><span className="sr-only">Settled</span></>
                                                                        ) : (
                                                                            <div className="w-4 h-4 mr-2" />
                                                                        )}
                                                                        <span>{split.profiles?.name || 'Unknown User'}</span>
                                                                    </div>
                                                                    <span className={split.settled ? 'text-secondary-foreground' : 'text-foreground font-medium'}>
                                                                        ${split.amount.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                                {/* --- NEW: UI to Display Adjustments --- */}
                                                                {split.expense_split_adjustments && split.expense_split_adjustments.length > 0 && (
                                                                    <div className="ml-6 mt-1 space-y-1 border-l-2 border-dashed border-border pl-3">
                                                                        {split.expense_split_adjustments.map(adj => (
                                                                            <div key={adj.id} className="text-xs text-secondary-foreground italic">
                                                                                Adjustment: {adj.adjustment_amount > 0 ? `+` : ''}${adj.adjustment_amount.toFixed(2)} by {adj.profiles?.name || 'system'}
                                                                                {adj.reason && ` (${adj.reason})`}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )) : <p className="text-sm text-secondary-foreground">This was a personal expense.</p>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )) 
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'communication' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium text-foreground">Members</h3>
                            {isAdmin && (
                                <Button onClick={() => setShowManageJoinCode(true)} variant="secondary" size="sm">
                                    <Share2 className="h-4 w-4 mr-1" /> Manage Join Code
                                </Button>
                            )}
                        </div>
                        <div className="space-y-3">
                            {loadingData && members.length === 0 ? <LoadingSpinner/> : members.map(member => (<div key={member.id} className="bg-background rounded-lg shadow p-4 border border-border"><div className="flex items-center justify-between"><div className="flex items-center"><div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground">{member.profiles?.name?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}</div><div className="ml-3"><p className="font-medium text-foreground">{member.profiles?.name}</p><p className="text-xs text-secondary-foreground">{member.role}</p></div></div></div></div>))}
                        </div>
                        <div className="mt-6">
                            <h3 className="text-lg font-medium text-foreground mb-4">Household Chat</h3>
                            <HouseholdChat householdId={householdId} members={memberProfiles} />
                        </div>
                    </div>
                )}

                {activeTab === 'rules' && household && (
                    <div className="bg-background rounded-lg shadow border border-border">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-foreground">House Rules</h3>
                                        {isAdmin && (
                                            <Button onClick={() => setShowAddRuleModal(true)}>
                                                <Plus className="h-4 w-4 mr-2" /> Add New Rule
                                            </Button>
                                        )}
                                </div>
                                <div className="space-y-4">
                                    {household.rules && household.rules.length > 0 ? (
                                    household.rules.map((rule) => (
                                        <RuleCard key={rule.id} rule={rule} isAdmin={isAdmin} onEdit={rule => { setRuleToEdit(rule); setShowEditRuleModal(true); }} onDelete={async (id) => { if(window.confirm('Are you sure?')) { await deleteHouseRule(householdId, id); refreshData(true) }}} />
                                    ))
                                    ) : (
                                    <div className="text-center py-8">
                                        <p className="text-sm text-secondary-foreground">No house rules have been added yet.</p>
                                        {isAdmin && <p className="text-xs text-secondary-foreground opacity-70 mt-1">Click &quot;Add New Rule&quot; to get started.</p>}
                                    </div>
                                    )}
                                </div>
                            </div>
                    </div>
                )}
            </div>

            {showAddExpense && <AddExpenseModal householdId={householdId} members={members} onClose={() => setShowAddExpense(false)} onExpenseAdded={() => refreshData(true)} />}
            {showSettleUp && <SettleUpModal householdId={householdId} members={members} settlementSuggestions={settlementSuggestions} onClose={() => setShowSettleUp(false)} onSettlementCreated={() => refreshData(true)} />}
            {showAddRecurring && <AddRecurringExpenseModal householdId={householdId} onClose={() => setShowAddRecurring(false)} onExpenseAdded={() => refreshData(true)} />}
            {showManageJoinCode && householdId && <ManageJoinCodeModal householdId={householdId} currentCode={household?.join_code} onClose={() => setShowManageJoinCode(false)} onCodeRefreshed={(newCode) => { if(household) setHousehold({...household, join_code: newCode }); }} />}
            
            {isProfileModalOpen && user && <ProfileModal user={user} onClose={() => setIsProfileModalOpen(false)} onUpdate={() => refreshData(true)} />}
            {isHouseholdSettingsModalOpen && household && <HouseholdSettingsModal household={household} members={members} onClose={() => setIsHouseholdSettingsModalOpen(false)} onUpdate={() => refreshData(true)} />}
            
            {showAddRuleModal && household && <AddRuleModal householdId={household.id} onClose={() => setShowAddRuleModal(false)} onRuleAdded={() => {setShowAddRuleModal(false); refreshData(true);}} />}
            {showEditRuleModal && ruleToEdit && household && <EditRuleModal householdId={household.id} rule={ruleToEdit} onClose={() => setRuleToEdit(null)} onRuleUpdated={() => {setRuleToEdit(null); refreshData(true);}} />}
            {editingExpense && (
                <EditExpenseModal
                    expense={editingExpense}
                    members={members}
                    onClose={() => setEditingExpense(null)}
                    onExpenseUpdated={() => {
                        setEditingExpense(null);
                        refreshData(true);
                    }}
                />
            )}
        </Layout>
        );
        };


// Application state machine for top-level navigation and user flow
type AppState = 'loading' | 'landing' | 'authForm' | 'onboardingChoice' | 'householdSetup' | 'dashboard' | 'joinWithCode' | 'householdWelcome';

/**
 * Main App component that manages authentication state and application routing
 * Uses a state machine pattern to handle complex user flows and onboarding
 */
const App: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const [appState, setAppState] = useState<AppState>('loading');
    const [isRegisteringForAuthForm, setIsRegisteringForAuthForm] = useState(false);
    const [welcomeHouseholdId, setWelcomeHouseholdId] = useState<string | null>(null);
    const [targetHouseholdAfterJoin, setTargetHouseholdAfterJoin] = useState<Household | null>(null);
    const [userHasHouseholds, setUserHasHouseholds] = useState<boolean | null>(null);

    // Complex state determination logic that handles user authentication and onboarding flow
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
                const userHouseholds = await getUserHouseholds();
                setUserHasHouseholds(userHouseholds.length > 0);
                
                // Handle URL parameter for post-join welcome flow
                const queryParams = new URLSearchParams(window.location.search);
                const joinedHouseholdIdParam = queryParams.get('joinedHouseholdId');
                if (joinedHouseholdIdParam) {
                    setWelcomeHouseholdId(joinedHouseholdIdParam);
                    setAppState('householdWelcome');
                    // Clean URL after processing the parameter
                    const nextURL = new URL(window.location.href);
                    nextURL.searchParams.delete('joinedHouseholdId');
                    window.history.replaceState({}, '', nextURL.toString());
                } else if (targetHouseholdAfterJoin) {
                    // Handle in-app household join flow
                    setWelcomeHouseholdId(targetHouseholdAfterJoin.id);
                    setAppState('householdWelcome');
                    setTargetHouseholdAfterJoin(null);
                } else if (userHouseholds.length === 0) {
                    // New user onboarding
                    setAppState('onboardingChoice');
                } else {
                    // Existing user with households
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

    if (appState === 'loading' || (user && userHasHouseholds === null)) return <LoadingSpinner />;

    // Helper function to handle cancellation of household setup/join flows
    const handleCancelSetupOrJoin = () => {
        setAppState(userHasHouseholds ? 'dashboard' : 'onboardingChoice');
    };

    // Main application router based on current state
    switch (appState) {
        case 'landing': return <LandingPageContent onSignIn={() => { setIsRegisteringForAuthForm(false); setAppState('authForm'); }} onSignUp={() => { setIsRegisteringForAuthForm(true); setAppState('authForm'); }} />;
        case 'authForm': return <AuthForm isRegisteringInitially={isRegisteringForAuthForm} />;
        case 'onboardingChoice': return <OnboardingChoice onCreateHousehold={() => setAppState('householdSetup')} onJoinHousehold={() => setAppState('joinWithCode')} />;
        case 'householdSetup':
            return (
                <Layout title="Create Household" showBack onBack={handleCancelSetupOrJoin}>
                    <div className="flex justify-center">
                            <HouseholdSetupForm
                                onHouseholdCreated={(hid) => {
                                    toast.success('Household created!');
                                    setUserHasHouseholds(true);
                                    setWelcomeHouseholdId(hid);
                                    setAppState('householdWelcome');
                                }}
                                onCancel={handleCancelSetupOrJoin}
                            />
                    </div>
                </Layout>
            );
        case 'joinWithCode': 
            return (
                <Layout title="Join Household" showBack onBack={handleCancelSetupOrJoin}>
                    <JoinHouseholdWithCode
                        onJoined={(household) => {
                            setUserHasHouseholds(true);
                            setTargetHouseholdAfterJoin(household);
                        }}
                        onCancel={handleCancelSetupOrJoin}
                    />
                </Layout>
            );
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

/**
 * Root component that wraps the app with authentication context
 * This is the entry point for the entire application
 */
export default function RoomiesApp() {
    return ( <AuthProvider> <App /> </AuthProvider> );
}
