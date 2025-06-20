// src/components/RoomiesApp.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronRight, Home, DollarSign, CheckSquare, Plus, LogOut, Menu, X, ArrowLeft, Loader2, CreditCard, MessageSquare, Settings, ClipboardList, User, Share2, LifeBuoy, Edit3, Trash2, Phone, Mail } from 'lucide-react';

import * as api from '../lib/api';
import { Household, HouseholdMember, Expense, Settlement, RecurringExpense, HouseRule, Profile } from '../lib/types/types';
import { User as SupabaseUser } from '@supabase/supabase-js';

import { AuthProvider, useAuth } from './AuthProvider';
import { NotificationBell } from './NotificationsPanel';
import { Toaster, toast } from 'react-hot-toast';

// Component Imports
import { LandingPageContent } from './LandingPageContent';
import { HouseholdSetupForm } from './HouseholdSetupForm';
import { OnboardingChoice } from './OnboardingChoice';
import HouseholdChat from './HouseholdChat';
import { ChoreDashboard } from './ChoreDashboard';
import { AddExpenseModal } from './AddExpenseModal';
import { AddRecurringExpenseModal } from './AddRecurringExpenseModal';
import { SettleUpModal } from './SettleUpModal';
import { ManageJoinCodeModal } from './ManageJoinCodeModal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { ProfileModal } from './ProfileModal';
import { HouseholdSettingsModal } from './HouseholdSettingsModal';


// --- START: SHARED & HELPER COMPONENTS ---

const UserMenu: React.FC<{ onProfileClick: () => void; onSettingsClick: () => void; onSignOut: () => void; householdSelected: boolean; }> = ({ onProfileClick, onSettingsClick, onSignOut, householdSelected }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-full hover:bg-secondary">
                <User className="h-5 w-5" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-background rounded-md shadow-lg py-1 z-50 border border-border">
                    <button onClick={() => { onProfileClick(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary flex items-center">
                        <User className="h-4 w-4 mr-2" /> My Profile
                    </button>
                    {householdSelected && (
                        <button onClick={() => { onSettingsClick(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary flex items-center">
                            <Settings className="h-4 w-4 mr-2" /> Household Settings
                        </button>
                    )}
                    <div className="border-t border-border my-1"></div>
                    <button onClick={onSignOut} className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center">
                        <LogOut className="h-4 w-4 mr-2" /> Logout
                    </button>
                </div>
            )}
        </div>
    );
};


const Layout: React.FC<{
    children: React.ReactNode;
    title?: string;
    showBack?: boolean;
    onBack?: () => void;
    isHouseholdView?: boolean;
    onShowProfile?: () => void;
    onShowSettings?: () => void;
}> = ({
    children,
    title = 'Roomies',
    showBack = false,
    onBack,
    isHouseholdView = false,
    onShowProfile = () => {},
    onShowSettings = () => {}
}) => {
    const { user, signOut } = useAuth();
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

                            {user && (
                                <div className="flex items-center space-x-2">
                                    <div className="hidden md:flex items-center space-x-2">
                                        <NotificationBell />
                                        <UserMenu
                                            onProfileClick={onShowProfile}
                                            onSettingsClick={onShowSettings}
                                            onSignOut={signOut}
                                            householdSelected={isHouseholdView}
                                        />
                                    </div>
                                    <div className="flex items-center md:hidden">
                                        <NotificationBell />
                                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="ml-2 p-2 rounded-md hover:bg-secondary">
                                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {mobileMenuOpen && (
                        <div className="md:hidden border-t border-border">
                            <div className="px-4 py-3 space-y-2">
                                <button onClick={()=>{onShowProfile(); setMobileMenuOpen(false);}} className="w-full justify-start flex items-center p-2 rounded-md hover:bg-secondary text-sm font-medium"> <User className="h-4 w-4 mr-2"/> My Profile</button>
                                {isHouseholdView && (
                                    <button onClick={()=>{onShowSettings(); setMobileMenuOpen(false);}} className="w-full justify-start flex items-center p-2 rounded-md hover:bg-secondary text-sm font-medium"> <Settings className="h-4 w-4 mr-2"/> Household Settings</button>
                                )}
                                <div className="border-t border-border"/>
                                <Button onClick={signOut} variant="secondary" size="sm" className="w-full justify-start">
                                    <LogOut className="h-4 w-4 mr-2" />
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
    const { signIn, signUp, signInWithGoogle, signInWithPhone, verifyOtp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [isRegistering, setIsRegistering] = useState(isRegisteringInitially);
    const [isLoading, setIsLoading] = useState(false);
    const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
    const [otpSent, setOtpSent] = useState(false);

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const { error: authError } = isRegistering
                ? await signUp(email, password, name)
                : await signIn(email, password);
            if (authError) setError(authError.message);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unexpected error occurred');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePhoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const { error } = await signInWithPhone(phone);
        if (error) {
            setError(error.message);
        } else {
            setOtpSent(true);
        }
        setIsLoading(false);
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const { error } = await verifyOtp(phone, otp);
        if (error) setError(error.message);
        // On success, onAuthStateChange handles the rest
        setIsLoading(false);
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setIsLoading(true);
        try {
            const { error: authError } = await signInWithGoogle();
            if (authError) setError(authError.message);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unexpected error occurred with Google sign-in');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Resets form state when switching auth methods
    useEffect(() => {
        setError('');
        setEmail('');
        setPassword('');
        setPhone('');
        setOtp('');
        setOtpSent(false);
    }, [authMethod, isRegistering]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
                        {isRegistering ? 'Create your account' : 'Welcome back'}
                    </h2>
                     <p className="mt-2 text-center text-sm text-secondary-foreground">
                        {isRegistering ? 'Get started with Roomies today.' : 'Sign in to manage your shared living space'}
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    {/* Tabs for Email/Phone */}
                    {!isRegistering && (
                        <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary p-1">
                            <button onClick={() => setAuthMethod('email')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${authMethod === 'email' ? 'bg-background text-foreground shadow-sm' : 'text-secondary-foreground hover:bg-background/50'}`}>
                                <Mail className="inline h-4 w-4 mr-2" /> Email
                            </button>
                            <button onClick={() => setAuthMethod('phone')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${authMethod === 'phone' ? 'bg-background text-foreground shadow-sm' : 'text-secondary-foreground hover:bg-background/50'}`}>
                                <Phone className="inline h-4 w-4 mr-2" /> Phone
                            </button>
                        </div>
                    )}

                    {authMethod === 'email' && (
                        <form onSubmit={handleEmailSubmit} className="space-y-4">
                            <div className="rounded-md shadow-sm -space-y-px">
                                {isRegistering && (
                                    <div>
                                        <Input type="text" required className="rounded-b-none" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                                    </div>
                                )}
                                <div>
                                    <Input type="email" required className={isRegistering ? '' : 'rounded-t-md'} placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>
                                <div>
                                    <Input type="password" required className="rounded-t-none" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                            </div>
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isRegistering ? 'Create Account' : 'Sign in')}
                            </Button>
                        </form>
                    )}

                    {authMethod === 'phone' && !isRegistering && (
                        <>
                            {!otpSent ? (
                                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                                    <div>
                                        <label htmlFor="phone" className="sr-only">Phone Number</label>
                                        <Input id="phone" type="tel" placeholder="e.g., +14155552671" value={phone} onChange={(e) => setPhone(e.target.value)} required/>
                                    </div>
                                    <Button type="submit" disabled={isLoading} className="w-full">
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Code'}
                                    </Button>
                                </form>
                            ) : (
                                <form onSubmit={handleOtpSubmit} className="space-y-4">
                                    <div>
                                        <label htmlFor="otp" className="sr-only">Verification Code</label>
                                        <Input id="otp" type="text" inputMode="numeric" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} required />
                                    </div>
                                    <Button type="submit" disabled={isLoading} className="w-full">
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify and Sign In'}
                                    </Button>
                                </form>
                            )}
                        </>
                    )}

                    {error && (
                        <div className="text-destructive text-sm text-center pt-2">{error}</div>
                    )}
                    
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-background text-secondary-foreground">Or</span>
                        </div>
                    </div>

                    <div>
                        <Button onClick={handleGoogleSignIn} variant="outline" className="w-full" disabled={isLoading}>
                            <svg className="mr-2 -ml-1 w-4 h-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.3 512 0 401.8 0 261.8S110.3 11.8 244 11.8c70.3 0 120.5 28.5 160.8 66.2l-64.8 64.3c-32.3-30.5-73.8-50-129.5-50-101.5 0-184.5 83.3-184.5 186.2s83 186.2 184.5 186.2c104.5 0 162.5-74.8 162.5-149.3 0-25.5-3-50.5-8.8-74.8H244V261.8z"></path></svg>
                            Sign in with Google
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
    const { user } = useAuth();
    const [households, setHouseholds] = useState<Household[]>([]);
    const [loadingHouseholds, setLoadingHouseholds] = useState(true);
    const [selectedHousehold, setSelectedHousehold] = useState<string | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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


type HouseholdDetailTab = 'money' | 'structuredChores' | 'communication' | 'rules';


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
            await api.addHouseRule(householdId, category.trim(), content.trim());
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
            await api.updateHouseRule(householdId, { ...rule, category, content });
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
    const [showSettleUp, setShowSettleUp] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isHouseholdSettingsModalOpen, setIsHouseholdSettingsModalOpen] = useState(false);
    const [showAddRuleModal, setShowAddRuleModal] = useState(false);
    const [showEditRuleModal, setShowEditRuleModal] = useState(false);
    const [ruleToEdit, setRuleToEdit] = useState<HouseRule | null>(null);
    

    const isLoadingRef = useRef(false);
    const isMountedRef = useRef(true);

    const isAdmin = useMemo(() => members.find(m => m.user_id === user?.id)?.role === 'admin', [members, user]);

    const refreshData = useCallback(async (showToast = false) => {
        if (isLoadingRef.current || !isMountedRef.current) return;
        isLoadingRef.current = true;
        if (!showToast) setLoadingData(true);
        
        try {
            const data = await api.getHouseholdData(householdId);
            if (!isMountedRef.current) return;
            
            if (data.household) setHousehold(data.household);
            setMembers(data.members || []);
            setExpenses(data.recent_expenses || []);
            setSettlements(data.recent_settlements || []);

            const recurringData = await api.getHouseholdRecurringExpenses(householdId);
            if (!isMountedRef.current) return;
            
            setRecurringExpenses(recurringData);
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

    const balances = useMemo(() => api.calculateBalances(expenses, members, settlements), [expenses, members, settlements]);
    const settlementSuggestions = useMemo(() => api.getSettlementSuggestions ? api.getSettlementSuggestions(balances) : [], [balances]);

        // New: Calculate the current user's overall balance
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

    // This extracts the Profile from each HouseholdMember for the chat
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
                        {(['structuredChores', 'money', 'communication', 'rules'] as HouseholdDetailTab[]).map(tab => (
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
                                <Button onClick={() => setShowSettleUp(true)} size="sm">
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
                            <div className="flex justify-between items-center"><h3 className="text-lg font-medium text-foreground">One-Time Expenses</h3><Button onClick={() => setShowAddExpense(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Add Expense</Button></div>
                            <div className="space-y-3">
                                {loadingData && expenses.length === 0 ? <LoadingSpinner/> : expenses.length === 0 ? <p className="text-secondary-foreground text-center py-4">No one-time expenses.</p> : ( expenses.map(expense => (<div key={expense.id} className="bg-background rounded-lg shadow p-4 border border-border"><div className="flex justify-between items-start"><div className="flex-1"><h4 className="font-medium text-foreground">{expense.description}</h4><p className="text-sm text-secondary-foreground">Paid by {expense.profiles?.name} • {new Date(expense.date + (expense.date.includes('T') ? '' : 'T00:00:00')).toLocaleDateString()}</p></div><div className="text-right ml-4"><p className="font-medium text-foreground">${expense.amount.toFixed(2)}</p></div></div></div>)) )}
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
                                        <RuleCard key={rule.id} rule={rule} isAdmin={isAdmin} onEdit={rule => { setRuleToEdit(rule); setShowEditRuleModal(true); }} onDelete={async (id) => { if(window.confirm('Are you sure?')) { await api.deleteHouseRule(householdId, id); refreshData(true) }}} />
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
    const [userHasHouseholds, setUserHasHouseholds] = useState<boolean | null>(null);

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
                setUserHasHouseholds(userHouseholds.length > 0);
                
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

    if (appState === 'loading' || (user && userHasHouseholds === null)) return <LoadingSpinner />;

    const handleCancelSetupOrJoin = () => {
        setAppState(userHasHouseholds ? 'dashboard' : 'onboardingChoice');
    };

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

export default function RoomiesApp() {
    return ( <AuthProvider> <App /> </AuthProvider> );
}