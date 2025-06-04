// src/components/RoomiesApp.tsx
"use client";
import React, { useState, useEffect } from 'react'; // Removed useContext, createContext as AuthProvider handles that
import { ChevronRight, Home, Users, DollarSign, CheckSquare, Plus, UserPlus, LogOut, Menu, X, ArrowLeft, Check, User, Loader2, CreditCard, ArrowRightLeft, Bell } from 'lucide-react';
// import { supabase } from '@/lib/supabase'; // Not directly needed here
// import { User as SupabaseUser } from '@supabase/supabase-js'; // Not directly needed here
import * as api from '@/lib/api';
import type { Profile, Household, HouseholdMember, Expense, Task, Settlement, RecurringExpense } from '@/lib/api';
import { AuthProvider, useAuth } from './AuthProvider'; // AuthProvider is now imported here
import { NotificationBell } from './NotificationsPanel';
import { Toaster, toast } from 'react-hot-toast';

// Import new components
import { LandingPageContent } from './LandingPageContent';
import { HouseholdSetupForm } from './HouseholdSetupForm';
import { OnboardingChoice } from './OnboardingChoice';


// Layout Component (remains largely the same)
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

// Auth Pages (Login)
const LoginPageContentWrapper: React.FC = () => { // Renamed to avoid conflict if you make a separate LoginPage
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
      const { error: authError } = isRegistering
        ? await signUp(email, password, name)
        : await signIn(email, password);
      if (authError) {
        setError(authError.message);
      }
      // On success, AuthProvider will update user state and RoomiesApp will re-render
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
     <LandingPageContent
        onSignIn={() => {
            // This function would ideally trigger a modal or navigate to a dedicated login view
            // For now, we assume the LandingPageContent has its own login/signup forms or triggers them
            // For simplicity, this example does not implement the actual modal trigger
            // but you'd connect this to `isRegistering = false` and show the form.
             setIsRegistering(false); // Example: Toggling a state to show login form directly if integrated
             console.log("Sign In clicked on landing page");
             // If your LoginPage is modal, trigger it here.
             // If it's a separate page, use router.push('/login') after setting up such a page.
             // For MVP, we can reuse RoomiesApp's internal auth form for demo
             // by having LandingPageContent be replaced by the actual auth form.
        }}
        onSignUp={() => {
            setIsRegistering(true); // Example: Toggling a state to show signup form
            console.log("Sign Up clicked on landing page");
        }}
    />
    // The actual login form can be part of LandingPageContent or a modal shown by it.
    // For this integration, we'll show the form if isRegistering changes after onSignUp/onSignIn click
    // This is a simplified approach. A modal system would be cleaner.
  );
};

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
      // On success, AuthProvider will update user state and RoomiesApp will re-render
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
  )

}


// Invite Member Modal (remains the same)
const InviteMemberModal = ({ 
  show, 
  onClose, 
  householdId, 
  onSuccess 
}: { 
  show: boolean; 
  onClose: () => void; 
  householdId: string;
  onSuccess: () => void;
}) => {
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!inviteeEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.inviteUserToHousehold(householdId, inviteeEmail.trim());
      toast.success('Invitation sent!');
      setInviteeEmail('');
      onClose();
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Member</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter member's email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={inviteeEmail}
              onChange={(e) => setInviteeEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !submitting && handleSubmit()}
            />
            <p className="mt-1 text-xs text-gray-500">
              The user must have a registered account to receive invitations
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !inviteeEmail.trim()}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
};


// MyInvitations Component (remains largely the same)
const MyInvitations: React.FC = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadInvitations();
    }
  }, [user]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const data = await api.getPendingInvitations();
      setInvitations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };


const handleAccept = async (invitationId: string) => {
  setProcessingId(invitationId);
  try {
    const result = await api.acceptInvitation(invitationId);
    if (result && result.success && result.household) {
      toast.success('Invitation accepted!');
      // Instead of full reload, navigate to a page that shows household info
      // For MVP, we can still reload, but ideally we'd show HouseholdInfoDisplay
      // router.push(`/household-welcome?householdId=${result.household.id}`);
      window.location.reload(); // Or trigger state update to show dashboard
    } else {
      toast.error(result.rpcData?.message || 'Failed to accept invitation');
    }
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    toast.error(error.message || 'Failed to accept invitation');
  } finally {
    setProcessingId(null);
  }
};

  const handleDecline = async (invitationId: string) => {
    setProcessingId(invitationId);
    try {
      await api.declineInvitation(invitationId);
      toast.success('Invitation declined');
      await loadInvitations();
    } catch (error: any) {
      console.error('Error declining invitation:', error);
      toast.error(error.message || 'Failed to decline invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const formatExpiryTime = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const timeLeftMs = expiry.getTime() - now.getTime();

    if (timeLeftMs <= 0) {
      return { text: 'Expired', isExpired: true };
    }

    const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));
    const minutesLeft = Math.floor(timeLeftMs / (1000 * 60));

    if (hoursLeft < 1) {
      if (minutesLeft <= 0) return { text: 'Expired', isExpired: true };
      return { text: `Expires in ${minutesLeft} ${minutesLeft === 1 ? 'minute' : 'minutes'}`, isExpired: false };
    } else if (hoursLeft < 24) {
      return { text: `Expires in ${hoursLeft} ${hoursLeft === 1 ? 'hour' : 'hours'}`, isExpired: false };
    } else {
      const daysLeft = Math.floor(hoursLeft / 24);
      return { text: `Expires in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`, isExpired: false };
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-3" />
        <p>No pending invitations</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Invitations</h3>
      {invitations.map((invitation) => {
        const expiryInfo = formatExpiryTime(invitation.expires_at);
        return (
          <div key={invitation.id} className={`bg-white rounded-lg shadow p-4 ${expiryInfo.isExpired ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">
                  {invitation.households?.name || 'Unknown Household'}
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  Invited by {invitation.inviter?.name || 'Unknown User'}
                </p>
                <div className="flex items-center space-x-3 mt-1">
                  <p className="text-xs text-gray-400">
                    {new Date(invitation.created_at).toLocaleDateString()}
                  </p>
                  <span className={`text-xs ${expiryInfo.isExpired ? 'text-red-500' : 'text-orange-500'}`}>
                    {expiryInfo.text}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleAccept(invitation.id)}
                  disabled={processingId === invitation.id || expiryInfo.isExpired}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === invitation.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Accept'
                  )}
                </button>
                <button
                  onClick={() => handleDecline(invitation.id)}
                  disabled={processingId === invitation.id || expiryInfo.isExpired}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === invitation.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Decline'
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Welcome page for users who accepted an invitation
const HouseholdWelcomeDisplay: React.FC<{ householdId: string; onProceed: () => void }> = ({ householdId, onProceed }) => {
  const [household, setHousehold] = useState<api.Household | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      const details = await api.getHouseholdDetails(householdId);
      setHousehold(details);
      setLoading(false);
    };
    fetchDetails();
  }, [householdId]);

  if (loading) return <LoadingSpinner />;
  if (!household) return <p className="text-red-500">Could not load household details.</p>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="max-w-lg w-full bg-white p-8 rounded-xl shadow-2xl text-center">
        <h1 className="text-3xl font-bold text-emerald-700 mb-4">Welcome to {household.name}!</h1>
        <p className="text-gray-600 mb-6">
          You've successfully joined your new household. Here are some details set up by your admin:
        </p>
        <div className="text-left space-y-3 bg-gray-50 p-6 rounded-lg border">
          <p><strong>Household Name:</strong> {household.name}</p>
          <p><strong>Target Members:</strong> {household.member_count || 'Not set'}</p>
          <p><strong>Core Chores:</strong> {household.core_chores || 'Not set'}</p>
          <p><strong>Chore Frequency:</strong> {household.chore_frequency || 'Not set'}</p>
          <p><strong>Chore Framework:</strong> {household.chore_framework || 'Not set'}</p>
        </div>
        <button
          onClick={onProceed}
          className="mt-8 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-6 rounded-md text-lg font-medium transition duration-150"
        >
          Continue to Dashboard
        </button>
      </div>
    </div>
  );
};


const Dashboard: React.FC = () => {
  // const { user } = useAuth();
  const { user, profile } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loadingHouseholds, setLoadingHouseholds] = useState(true);
  const [showCreateHouseholdModal, setShowCreateHouseholdModal] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [creatingHousehold, setCreatingHousehold] = useState(false);
  const [selectedHousehold, setSelectedHousehold] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'households' | 'invitations'>('households');

  useEffect(() => {
    loadHouseholds();
  }, [user]);

  const loadHouseholds = async () => {
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
  };

  const handleCreateHousehold = async () => {
    if (!newHouseholdName.trim() || !user) return;

    setCreatingHousehold(true);
    try {
      // For MVP, using the simplified createHousehold (only name)
      // This will be replaced by the HouseholdSetupForm flow
      await api.createHousehold({ name: newHouseholdName, member_count: 2 }); // Default member_count for old flow
      await loadHouseholds();
      setNewHouseholdName('');
      setShowCreateHouseholdModal(false);
      toast.success('Household created!');
    } catch (error) {
      console.error('Error creating household:', error);
      toast.error('Failed to create household');
    } finally {
      setCreatingHousehold(false);
    }
  };
  
  if (selectedHousehold) {
    return <HouseholdDetail householdId={selectedHousehold} onBack={() => setSelectedHousehold(null)} />;
  }

  return (
    // <Layout title={user?.name || "Dashboard"}>
    <Layout title={profile?.name || "Dashboard"}>
      <div className="space-y-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('households')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'households'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Home className="inline h-4 w-4 mr-1" />
              My Households
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invitations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserPlus className="inline h-4 w-4 mr-1" />
              Invitations
            </button>
          </nav>
        </div>

        {activeTab === 'households' ? (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Your Households</h2>
              {/* This button will be less prominent if HouseholdSetupForm is the primary creation path */}
              <button
                onClick={() => setShowCreateHouseholdModal(true)} // This could also navigate to the HouseholdSetupForm view
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Household (Quick)
              </button>
            </div>

            {loadingHouseholds ? (
              <LoadingSpinner />
            ) : households.length === 0 ? (
              <div className="text-center py-12">
                <Home className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No households yet.</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new household or accepting an invitation.</p>
                 {/* The actual OnboardingChoice or HouseholdSetupForm should be rendered by App component */}
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
                          {household.memberCount || '?'} {Number(household.memberCount) === 1 ? 'member' : 'members'}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <MyInvitations />
        )}

        {showCreateHouseholdModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Household (Quick)</h3>
              <input
                type="text"
                placeholder="Household name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={newHouseholdName}
                onChange={(e) => setNewHouseholdName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !creatingHousehold && handleCreateHousehold()}
              />
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateHouseholdModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                  disabled={creatingHousehold}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateHousehold}
                  disabled={creatingHousehold || !newHouseholdName.trim()}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatingHousehold ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

// Household Detail Page (remains largely the same)
const HouseholdDetail: React.FC<{ householdId: string; onBack: () => void }> = ({ householdId, onBack }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'expenses' | 'members' | 'tasks' | 'settlements'>('expenses');
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loadingData, setLoadingData] = useState(true); // Renamed to avoid conflict

  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [showAddRecurring, setShowAddRecurring] = useState(false);

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);

  const loadRecurringExpenses = async () => {
    try {
      const data = await api.getHouseholdRecurringExpenses(householdId);
      setRecurringExpenses(data);
    } catch (error) {
      console.error('Error loading recurring expenses:', error);
      toast.error('Failed to load recurring expenses.');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      let useOptimized = false;
      try {
        // Check if the optimized function exists and works
        if (typeof api.getHouseholdData === 'function') {
            const testData = await api.getHouseholdData(householdId);
            if (testData && testData.household) {
                useOptimized = true;
            }
        }
      } catch (e) {
        console.warn("Optimized getHouseholdData not available or failed, falling back.", e)
      }
      
      if (useOptimized) {
        await loadHouseholdDataOptimized();
      } else {
        await loadHouseholdData();
      }
      setLoadingData(false);
    };
    if(householdId) fetchData();
  }, [householdId]);
  
  useEffect(() => {
    const processRecurring = async () => {
      if (!householdId) return;
      try {
        await api.processDueRecurringExpenses(householdId);
        // Reload data after processing to reflect any new expenses created
        if (typeof api.getHouseholdData === 'function') {
            try {
                const testData = await api.getHouseholdData(householdId);
                if (testData && testData.household) {
                    loadHouseholdDataOptimized();
                } else {
                    loadHouseholdData();
                }
            } catch {
                loadHouseholdData();
            }
        } else {
            loadHouseholdData();
        }
      } catch (error) {
        console.error('Error processing recurring expenses:', error);
        toast.error('Error processing recurring expenses.');
      }
    };
  
    if(householdId) processRecurring();
  }, [householdId]); // Re-run if householdId changes, e.g. navigating between households


  const loadHouseholdDataOptimized = async () => {
    try {
      const data = await api.getHouseholdData(householdId);
      if (data) {
        setHousehold(data.household);
        setMembers(data.members || []);
        setExpenses(data.recent_expenses || []);
        setTasks(data.tasks || []);
        setSettlements(data.recent_settlements || []);
      }
      await loadRecurringExpenses();
    } catch (error) {
      console.error('Error loading household data (optimized):', error);
      toast.error('Failed to load household data.');
      await loadHouseholdData(); 
    } 
  };

  const loadHouseholdData = async () => {
    try {
      const [
          fetchedHousehold, // Get household details separately
          membersData, 
          expensesData, 
          tasksData, 
          settlementsData, 
          recurringData
        ] = await Promise.all([
        api.getHouseholdDetails(householdId), // Fetch household details
        api.getHouseholdMembers(householdId),
        api.getHouseholdExpenses(householdId),
        api.getHouseholdTasks(householdId),
        api.getHouseholdSettlements ? api.getHouseholdSettlements(householdId) : Promise.resolve([]),
        api.getHouseholdRecurringExpenses(householdId)
      ]);

      setHousehold(fetchedHousehold); // Set the fetched household data
      setMembers(membersData);
      setExpenses(expensesData);
      setTasks(tasksData);
      setSettlements(settlementsData);
      setRecurringExpenses(recurringData);

    } catch (error) {
      console.error('Error loading household data (standard):', error);
      toast.error('Failed to load household data.');
    }
  };
  // ... (rest of HouseholdDetail component: sendReminder, AddRecurringExpenseModal, AddExpenseModal, AddTaskModal, SettleUpModal, markExpenseSettled, completeTask, JSX)
  // The existing JSX for HouseholdDetail can remain largely the same.
  // Make sure to replace `loading` with `loadingData` in the JSX for this component.
  // For brevity, I'm not repeating the entire HouseholdDetail JSX here but ensure this change is made.

    const sendReminder = async (debtorId: string, amount: number) => {
    try {
      await api.sendPaymentReminder(householdId, debtorId, amount);
      toast.success('Reminder sent!');
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
    }
  };

  const balances = api.calculateBalances(expenses, members, settlements);
  const settlementSuggestions = api.getSettlementSuggestions ? api.getSettlementSuggestions(balances) : [];

  const AddRecurringExpenseModal = () => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'yearly'>('monthly');
    const [dayOfMonth, setDayOfMonth] = useState('1');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
      if (!description || !amount) return;

      setSubmitting(true);
      try {
        const startDate = new Date(); 
        await api.createRecurringExpense(
          householdId,
          description,
          parseFloat(amount),
          frequency,
          startDate,
          frequency === 'monthly' || frequency === 'quarterly' || frequency === 'yearly' ? parseInt(dayOfMonth) : undefined
        );
        await loadRecurringExpenses(); 
        setShowAddRecurring(false);
        toast.success('Recurring expense added!');
        setDescription('');
        setAmount('');
        setFrequency('monthly');
        setDayOfMonth('1');
      } catch (error) {
        console.error('Error creating recurring expense:', error);
        toast.error('Failed to create recurring expense');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Recurring Expense</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input
                type="text"
                placeholder="e.g., Rent, Internet, Utilities"
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
              <label className="block text-sm font-medium text-gray-700">Frequency</label>
              <select
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {(frequency === 'monthly' || frequency === 'quarterly' || frequency === 'yearly') && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Day of Month (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setShowAddRecurring(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !description || !amount}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </button>
          </div>
        </div>
      </div>
    );
  };

// START Enhanced AddExpenseModal (copied as is)
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
      const splitAmount = parseFloat(amount) / included.length;
      const newSplits: Record<string, number> = {};
      included.forEach(userId => {
        newSplits[userId] = Math.round(splitAmount * 100) / 100;
      });
      setCustomSplits(newSplits);
    }
  }, [amount, includedMembers, splitType]);

  useEffect(() => {
    if (splitType === 'percentage') {
      const included = Array.from(includedMembers);
      const equalPercentage = 100 / included.length;
      const newPercentages: Record<string, number> = {};
      included.forEach(userId => {
        newPercentages[userId] = Math.round(equalPercentage * 100) / 100;
      });
      setPercentageSplits(newPercentages);
    }
  }, [includedMembers, splitType]);

  const toggleMemberInclusion = (userId: string) => {
    const newIncluded = new Set(includedMembers);
    if (newIncluded.has(userId)) {
      if (newIncluded.size > 1) { 
        newIncluded.delete(userId);
      }
    } else {
      newIncluded.add(userId);
    }
    setIncludedMembers(newIncluded);
  };

  const updateCustomSplit = (userId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setCustomSplits(prev => ({
      ...prev,
      [userId]: Math.round(numValue * 100) / 100
    }));
  };

  const updatePercentageSplit = (userId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setPercentageSplits(prev => ({
      ...prev,
      [userId]: Math.min(100, Math.max(0, numValue))
    }));
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
    if (splitType === 'custom') {
      return Object.values(customSplits).reduce((sum, val) => sum + val, 0);
    } else if (splitType === 'percentage') {
      const splits = calculateSplitsFromPercentages();
      return Object.values(splits).reduce((sum, val) => sum + val, 0);
    }
    return parseFloat(amount) || 0;
  };

  const getTotalPercentage = () => {
    return Array.from(includedMembers).reduce((sum, userId) => {
      return sum + (percentageSplits[userId] || 0);
    }, 0);
  };

  const isValidSplit = () => {
    const total = parseFloat(amount) || 0;
    
    if (splitType === 'custom') {
      const splitTotal = getTotalSplit();
      return Math.abs(splitTotal - total) < 0.01; 
    } else if (splitType === 'percentage') {
      const percentageTotal = getTotalPercentage();
      return Math.abs(percentageTotal - 100) < 0.01;
    }
    
    return true; 
  };

  const handleSubmit = async () => {
    if (!description || !amount || !isValidSplit()) return;

    setSubmitting(true);
    try {
      let splits: Array<{ user_id: string; amount: number }>;
      
      if (splitType === 'equal') {
        const included = Array.from(includedMembers);
        const splitAmount = parseFloat(amount) / included.length;
        splits = included.map(userId => ({
          user_id: userId,
          amount: Math.round(splitAmount * 100) / 100
        }));
      } else if (splitType === 'custom') {
        splits = Array.from(includedMembers).map(userId => ({
          user_id: userId,
          amount: customSplits[userId] || 0
        }));
      } else { // percentage
        const calculatedSplits = calculateSplitsFromPercentages();
        splits = Array.from(includedMembers).map(userId => ({
          user_id: userId,
          amount: calculatedSplits[userId] || 0
        }));
      }

      await api.createExpenseWithCustomSplits(
        householdId,
        description,
        parseFloat(amount),
        splits
      );
      
      await (typeof api.getHouseholdData === 'function' ? loadHouseholdDataOptimized() : loadHouseholdData());
      setShowAddExpense(false);
      toast.success('Expense added with custom splits!');
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error('Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  };

  const autoBalance = () => {
    const total = parseFloat(amount) || 0;
    const included = Array.from(includedMembers);
    const currentTotal = getTotalSplit();
    const difference = total - currentTotal;
    const adjustment = difference / included.length;
    
    const newSplits = { ...customSplits };
    included.forEach(userId => {
      newSplits[userId] = (newSplits[userId] || 0) + adjustment;
      newSplits[userId] = Math.round(newSplits[userId] * 100) / 100;
    });
    
    setCustomSplits(newSplits);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add Expense</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this expense for?"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Amount</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                step="0.01"
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">How to split?</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSplitType('equal')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  splitType === 'equal'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Equal Split
              </button>
              <button
                type="button"
                onClick={() => setSplitType('custom')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  splitType === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Custom Amounts
              </button>
                <button
                type="button"
                onClick={() => setSplitType('percentage')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  splitType === 'percentage'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                >
                By Percentage
                </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Split between ({includedMembers.size} {includedMembers.size === 1 ? 'person' : 'people'})
            </label>
            
            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-3">
              {members.map(member => {
                const isIncluded = includedMembers.has(member.user_id);
                const splitAmount = splitType === 'custom' 
                  ? customSplits[member.user_id] || 0
                  : splitType === 'percentage'
                  ? calculateSplitsFromPercentages()[member.user_id] || 0
                  : isIncluded 
                  ? (parseFloat(amount) || 0) / includedMembers.size 
                  : 0;

                return (
                  <div key={member.user_id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex items-center flex-1">
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        onChange={() => toggleMemberInclusion(member.user_id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 text-sm font-medium text-gray-700">
                        {member.profiles?.name}
                        {member.user_id === user?.id && ' (You)'}
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {splitType === 'custom' && isIncluded && (
                        <div className="flex items-center">
                          <span className="text-gray-500 mr-1">$</span>
                          <input
                            type="number"
                            step="0.01"
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                            value={customSplits[member.user_id] || ''}
                            onChange={(e) => updateCustomSplit(member.user_id, e.target.value)}
                            disabled={!isIncluded}
                          />
                        </div>
                      )}
                      
                      {splitType === 'percentage' && isIncluded && (
                        <div className="flex items-center">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                            value={percentageSplits[member.user_id] || ''}
                            onChange={(e) => updatePercentageSplit(member.user_id, e.target.value)}
                            disabled={!isIncluded}
                          />
                          <span className="text-gray-500 ml-1">%</span>
                        </div>
                      )}
                      
                      <span className={`text-sm font-medium ${isIncluded ? 'text-gray-900' : 'text-gray-400'}`}>
                        ${splitAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {splitType === 'custom' && (
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-sm ${Math.abs(getTotalSplit() - (parseFloat(amount) || 0)) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                  Total: ${getTotalSplit().toFixed(2)} / ${parseFloat(amount || '0').toFixed(2)}
                </span>
                {Math.abs(getTotalSplit() - (parseFloat(amount) || 0)) >= 0.01 && (
                  <button
                    type="button"
                    onClick={autoBalance}
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    Auto-balance
                  </button>
                )}
              </div>
            )}
            
            {splitType === 'percentage' && (
              <div className="mt-2">
                <span className={`text-sm ${Math.abs(getTotalPercentage() - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                  Total: {getTotalPercentage().toFixed(2)}%
                </span>
              </div>
            )}
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
            disabled={submitting || !description || !amount || !isValidSplit()}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Expense'}
          </button>
        </div>
      </div>
    </div>
  );
};
// END Enhanced AddExpenseModal


  const AddTaskModal = () => {
    const [title, setTitle] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
      if (!title) return;

      setSubmitting(true);
      try {
        const result = await api.createTask(householdId, title, assignedTo || undefined);
        console.log('Task created successfully:', result);
        await (typeof api.getHouseholdData === 'function' ? loadHouseholdDataOptimized() : loadHouseholdData());
        setShowAddTask(false);
        setTitle(''); 
        setAssignedTo('');
        toast.success('Task added!');
      } catch (error) {
        console.error('Error creating task:', error);
        if (error && typeof error === 'object') {
          console.error('Error details:', {
            message: (error as any).message,
            details: (error as any).details,
            hint: (error as any).hint,
            code: (error as any).code,
            fullError: JSON.stringify(error, null, 2)
          });
        }
        toast.error((error as any)?.message || 'Failed to create task');
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
              disabled={submitting || !title}
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
        const toProfile = members.find(m => m.user_id === selectedSuggestion.to)?.profiles;
        setDescription(`Payment to ${toProfile?.name || 'member'}`);
      }
    }, [selectedSuggestion, members]);

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
        await (typeof api.getHouseholdData === 'function' ? loadHouseholdDataOptimized() : loadHouseholdData());
        setShowSettleUp(false);
        toast.success('Settlement recorded!');
      } catch (error) {
        console.error('Error creating settlement:', error);
        toast.error('Failed to record settlement');
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

          {settlementSuggestions.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Suggested Settlements</h4>

              {myDebts.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">You owe:</p>
                  <div className="space-y-2">
                    {myDebts.map((suggestion, idx) => {
                      const toProfile = getProfileForSuggestion(suggestion, 'to');
                      return (
                        <button
                          key={`debt-${idx}`}
                          onClick={() => setSelectedSuggestion(suggestion)}
                          className={`w-full text-left p-3 rounded-lg border ${selectedSuggestion === suggestion
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm">
                              Pay <strong>{toProfile?.name || 'Unknown User'}</strong>
                            </span>
                            <span className="font-medium">${suggestion.amount.toFixed(2)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {owedToMe.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Owed to you:</p>
                  <div className="space-y-2">
                    {owedToMe.map((suggestion, idx) => {
                       const fromProfile = getProfileForSuggestion(suggestion, 'from');
                       return (
                        <div
                          key={`owed-${idx}`}
                          className="w-full text-left p-3 rounded-lg border border-gray-200 bg-gray-50"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              <strong>{fromProfile?.name || 'Unknown User'}</strong> owes you
                            </span>
                            <span className="font-medium text-gray-600">${suggestion.amount.toFixed(2)}</span>
                          </div>
                        </div>
                       );
                    })}
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
              disabled={submitting || !payeeId || !customAmount || parseFloat(customAmount) <=0}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Payment'}
            </button>
          </div>
        </div>
      </div>
    );
  };


  const markExpenseSettled = async (expenseId: string, userIdToSettle: string) => {
    try {
      await api.markExpenseSettled(expenseId, userIdToSettle);
      await (typeof api.getHouseholdData === 'function' ? loadHouseholdDataOptimized() : loadHouseholdData());
      toast.success('Expense part marked settled!');
    } catch (error) {
      console.error('Error marking expense as settled:', error);
      toast.error('Failed to mark expense settled.');
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      await api.completeTask(taskId);
      await (typeof api.getHouseholdData === 'function' ? loadHouseholdDataOptimized() : loadHouseholdData());
      toast.success('Task completed!');
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to complete task.');
    }
  };

  if (loadingData) {
    return (
      <Layout title="Loading..." showBack onBack={onBack}>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout title={household?.name || 'Household'} showBack onBack={onBack}>
      <div className="space-y-6">
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
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${balance.balance > 0 ? 'text-green-600' : balance.balance < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                    {balance.balance > 0 ? '+' : ''}${Math.abs(balance.balance).toFixed(2)}
                    {balance.balance < 0 && ' owed'}
                  </span>
                  {balance.balance < -5 && balance.userId !== user?.id && (
                    <button
                      onClick={() => sendReminder(balance.userId, Math.abs(balance.balance))}
                      className="text-xs text-blue-600 hover:text-blue-700"
                      title="Send payment reminder"
                    >
                      <Bell className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'expenses'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <DollarSign className="inline h-4 w-4 mr-1" />
              Expenses
            </button>
            <button
              onClick={() => setActiveTab('settlements')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'settlements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <ArrowRightLeft className="inline h-4 w-4 mr-1" />
              Settlements
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'members'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Users className="inline h-4 w-4 mr-1" />
              Members
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'tasks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <CheckSquare className="inline h-4 w-4 mr-1" />
              Tasks
            </button>
          </nav>
        </div>

        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-medium text-gray-700">Recurring Expenses</h4>
                <button
                  onClick={() => setShowAddRecurring(true)}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  <Plus className="h-4 w-4 inline mr-1" />
                  Add Recurring
                </button>
              </div>

              {loadingData && recurringExpenses.length === 0 ? <LoadingSpinner/> : recurringExpenses.length === 0 ? (
                <p className="text-sm text-gray-500">No recurring expenses set up</p>
              ) : (
                <div className="space-y-2">
                  {recurringExpenses.map(recurring => (
                    <div key={recurring.id} className="flex justify-between items-center text-sm p-2 bg-white rounded shadow-sm">
                      <div>
                        <span className="font-medium">{recurring.description}</span>
                        <span className="text-gray-500 ml-2">
                          ${recurring.amount.toFixed(2)} {recurring.frequency}
                        </span>
                      </div>
                      <div className="text-gray-500">
                         Next: {new Date(recurring.next_due_date + (recurring.next_due_date.includes('T') ? '' : 'T00:00:00')).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Recent One-Time Expenses</h3>
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Expense
                </button>
              </div>
              <div className="space-y-3">
                {loadingData && expenses.length === 0 ? <LoadingSpinner/> : expenses.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No one-time expenses yet</p>
                ) : (
                  expenses.map(expense => (
                    <div key={expense.id} className="bg-white rounded-lg shadow p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{expense.description}</h4>
                          <p className="text-sm text-gray-500">
                            Paid by {expense.profiles?.name} • {new Date(expense.date + (expense.date.includes('T') ? '' : 'T00:00:00')).toLocaleDateString()}
                          </p>

                          <div className="mt-2 space-y-1">
                            {expense.expense_splits?.filter(split =>
                              split.user_id !== expense.paid_by && !split.settled
                            ).map(split => (
                              <div key={split.id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{split.profiles?.name} owes</span>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">${split.amount.toFixed(2)}</span>
                                  {user?.id === expense.paid_by && ( 
                                    <button
                                        onClick={() => markExpenseSettled(expense.id, split.user_id)}
                                        className="text-xs text-blue-600 hover:text-blue-500"
                                        title={`Mark ${split.profiles?.name}'s share as paid`}
                                    >
                                        Mark paid
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                             {expense.expense_splits?.filter(split =>
                              split.user_id !== expense.paid_by && split.settled
                            ).map(split => (
                              <div key={split.id} className="flex items-center justify-between text-sm">
                                <span className="text-gray-400 line-through">{split.profiles?.name} paid</span>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-400 line-through">${split.amount.toFixed(2)}</span>
                                   <Check className="h-4 w-4 text-green-500" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-medium text-gray-900">${expense.amount.toFixed(2)}</p>
                          {members.length > 0 && (
                             <p className="text-xs text-gray-500">
                               ${(expense.amount / (expense.expense_splits?.length || members.length || 1) ).toFixed(2)} each
                             </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}


        {activeTab === 'settlements' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Recent Settlements</h3>
            </div>
            <div className="space-y-3">
              {loadingData && settlements.length === 0 ? <LoadingSpinner/> : settlements.length === 0 ? (
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
            {loadingData && members.length === 0 ? <LoadingSpinner/> : members.map(member => (
                <div key={member.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                        {member.profiles?.name?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{member.profiles?.name}</p>
                        <p className="text-xs text-gray-400">{member.role}</p>
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
              {loadingData && tasks.filter(t => !t.completed).length === 0 && tasks.filter(t => t.completed).length === 0 ? (
                 <LoadingSpinner/>
              ): tasks.filter(t => !t.completed).length === 0 && tasks.filter(t => t.completed).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No tasks yet. Add some!</p>
              ) : (
                <>
                  {tasks.filter(t => !t.completed).length > 0 && <h4 className="text-sm font-medium text-gray-700">To Do</h4>}
                  {tasks.filter(t => !t.completed).map(task => (
                    <div key={task.id} className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <button
                            onClick={() => completeTask(task.id)}
                            className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100"
                            title="Mark task as complete"
                          >
                            <div className="h-5 w-5 rounded-full border-2 border-gray-300 hover:border-green-500" />
                          </button>
                          <div className="ml-3">
                            <p className="font-medium text-gray-900">{task.title}</p>
                            {task.profiles && (
                              <p className="text-sm text-gray-500">Assigned to {task.profiles.name}</p>
                            )}
                             {!task.profiles && (
                              <p className="text-sm text-gray-400">Unassigned</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {tasks.filter(t => t.completed).length > 0 && (
                    <>
                      <h4 className="text-sm font-medium text-gray-500 mt-6 pt-4 border-t">Completed</h4>
                      {tasks.filter(t => t.completed).map(task => (
                        <div key={task.id} className="bg-gray-100 rounded-lg p-4 opacity-70">
                          <div className="flex items-center">
                            <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                            <div className="ml-3">
                                <p className="text-gray-500 line-through">{task.title}</p>
                                {task.profiles && (
                                  <p className="text-xs text-gray-400 line-through">Done by {task.profiles.name}</p>
                                )}
                            </div>
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
      {showAddRecurring && <AddRecurringExpenseModal />}
      {showInviteMember && (
      <InviteMemberModal
        show={showInviteMember}
        onClose={() => setShowInviteMember(false)}
        householdId={householdId} 
        onSuccess={() => {
          (typeof api.getHouseholdData === 'function' ? loadHouseholdDataOptimized() : loadHouseholdData());
          toast('Household data refreshed after invitation.');
        }}
      />
    )}
  </Layout> 
);
};


// Main App Component - Modified for new onboarding flow
const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loadingUserHouseholds, setLoadingUserHouseholds] = useState(true);
  const [appState, setAppState] = useState<'loading' | 'landing' | 'authForm' | 'onboardingChoice' | 'householdSetup' | 'dashboard' | 'householdWelcome'>('loading');
  const [isRegistering, setIsRegistering] = useState(false);
  const [welcomeHouseholdId, setWelcomeHouseholdId] = useState<string | null>(null); // For showing household info after invite accept

  useEffect(() => {
    const determineState = async () => {
      if (authLoading) {
        setAppState('loading');
        return;
      }

      if (!user) {
        setAppState('landing'); // Show LandingPageContent via LoginPageContentWrapper
        return;
      }

      // User is logged in, check for households
      setLoadingUserHouseholds(true);
      try {
        const userHouseholds = await api.getUserHouseholds();
        setHouseholds(userHouseholds);
        if (userHouseholds.length === 0) {
          setAppState('onboardingChoice');
        } else {
          // Check if we need to show household welcome (e.g., after accepting invite)
          // This logic might need refinement based on how invite acceptance flow is fully handled
          const queryParams = new URLSearchParams(window.location.search);
          const acceptedInviteHouseholdId = queryParams.get('acceptedInviteToHousehold');
          if (acceptedInviteHouseholdId) {
            setWelcomeHouseholdId(acceptedInviteHouseholdId);
            setAppState('householdWelcome');
             // Clear the query param to prevent re-showing on refresh
            const nextURL = new URL(window.location.href);
            nextURL.searchParams.delete('acceptedInviteToHousehold');
            window.history.replaceState({}, '', nextURL.toString());
          } else {
            setAppState('dashboard');
          }
        }
      } catch (error) {
        console.error("Error fetching user households", error);
        toast.error("Could not fetch your household information.");
        setAppState('onboardingChoice'); // Fallback to choice if error
      } finally {
        setLoadingUserHouseholds(false);
      }
    };

    determineState();
  }, [user, authLoading]);

  if (appState === 'loading' || (user && loadingUserHouseholds)) {
    return <LoadingSpinner />;
  }

  if (appState === 'landing') {
     return (
        <LandingPageContent
            onSignIn={() => {
                setIsRegistering(false);
                setAppState('authForm');
            }}
            onSignUp={() => {
                setIsRegistering(true);
                setAppState('authForm');
            }}
        />
    );
  }

  if (appState === 'authForm') {
    return <AuthForm isRegisteringInitially={isRegistering} />;
  }

  if (appState === 'onboardingChoice') {
    return (
      <OnboardingChoice
        onCreateHousehold={() => setAppState('householdSetup')}
        onJoinHousehold={() => {
          // For MVP, navigate to the dashboard where "Invitations" tab can be selected
          // The MyInvitations component is part of the Dashboard view
          setAppState('dashboard'); 
        }}
      />
    );
  }

  if (appState === 'householdSetup') {
    return (
      <HouseholdSetupForm
        onHouseholdCreated={(householdId) => {
          toast.success('Household created successfully!');
          setAppState('dashboard'); // Navigate to dashboard
          // Optionally, trigger a refresh of households list in Dashboard state if needed
        }}
      />
    );
  }
    if (appState === 'householdWelcome' && welcomeHouseholdId) {
    return (
      <HouseholdWelcomeDisplay
        householdId={welcomeHouseholdId}
        onProceed={() => {
          setWelcomeHouseholdId(null);
          setAppState('dashboard');
        }}
      />
    );
  }


  if (appState === 'dashboard') {
    return <Dashboard />;
  }
  
  // Fallback or error state
  return <p>Something went wrong.</p>;
};


// Export with Auth Provider
export default function RoomiesApp() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
