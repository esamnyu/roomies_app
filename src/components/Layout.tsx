'use client';

import React, { useState } from 'react';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { NotificationBell } from './NotificationsPanel';
import { UserMenu } from './UserMenu';
import { Button } from '@/components/primitives/Button';
import { Toaster } from 'react-hot-toast';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  isHouseholdView?: boolean;
  onShowProfile?: () => void;
  onShowSettings?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
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
                    <button 
                      onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                      className="ml-2 p-2 rounded-md hover:bg-secondary"
                    >
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
                <button 
                  onClick={() => { onShowProfile(); setMobileMenuOpen(false); }} 
                  className="w-full justify-start flex items-center p-2 rounded-md hover:bg-secondary text-sm font-medium"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  My Profile
                </button>
                {isHouseholdView && (
                  <button 
                    onClick={() => { onShowSettings(); setMobileMenuOpen(false); }} 
                    className="w-full justify-start flex items-center p-2 rounded-md hover:bg-secondary text-sm font-medium"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Household Settings
                  </button>
                )}
                <div className="border-t border-border" />
                <Button onClick={signOut} variant="secondary" size="sm" className="w-full justify-start">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
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