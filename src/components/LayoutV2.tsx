'use client';

import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { NotificationBell } from './NotificationsPanel';
import { UserMenu } from './UserMenu';
import { Button } from './primitives/Button';
import { BottomNav, BottomNavSpacer } from './navigation/BottomNav';
import { Modal } from './surfaces/Modal';
import { SkipToContent } from './accessibility';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutV2Props {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  isHouseholdView?: boolean;
  onShowProfile?: () => void;
  onShowSettings?: () => void;
}

export const LayoutV2: React.FC<LayoutV2Props> = ({
  children,
  title = 'CoHab',
  showBack = false,
  onBack,
  isHouseholdView = false,
  onShowProfile = () => {},
  onShowSettings = () => {}
}) => {
  const { user, signOut } = useAuth();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  
  return (
    <>
      <SkipToContent />
      <div className="min-h-screen bg-secondary-50">
        {/* Mobile Header */}
        <header className="sticky top-0 z-sticky bg-white shadow-sm border-b border-secondary-200 md:relative">
          <div className="px-4 md:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14 md:h-16">
              <div className="flex items-center">
                {showBack && (
                  <button 
                    onClick={onBack} 
                    className="mr-3 p-2 -ml-2 rounded-lg hover:bg-secondary-100 active:scale-95"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <h1 className="text-lg md:text-xl font-semibold text-secondary-900">{title}</h1>
              </div>

              {user && (
                <div className="flex items-center space-x-1">
                  <NotificationBell />
                  <div className="hidden md:flex">
                    <UserMenu
                      onProfileClick={onShowProfile}
                      onSettingsClick={onShowSettings}
                      onSignOut={signOut}
                      householdSelected={isHouseholdView}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main 
          id="main-content"
          className="pb-14 md:pb-0"
        >
          <div className="px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        {user && (
          <BottomNav onMenuClick={() => setMoreMenuOpen(true)} />
        )}

        {/* More Menu Modal */}
        <Modal
          isOpen={moreMenuOpen}
          onClose={() => setMoreMenuOpen(false)}
          title="Menu"
          size="full"
          className="sm:max-w-md"
        >
          <div className="space-y-2">
            <button
              onClick={() => {
                onShowProfile();
                setMoreMenuOpen(false);
              }}
              className="w-full flex items-center p-3 rounded-lg hover:bg-secondary-100 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                <svg className="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-base font-medium">My Profile</span>
            </button>

            {isHouseholdView && (
              <button
                onClick={() => {
                  onShowSettings();
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center p-3 rounded-lg hover:bg-secondary-100 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                  <svg className="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-base font-medium">Household Settings</span>
              </button>
            )}

            <div className="border-t border-secondary-200 pt-2" />

            <button
              onClick={() => {
                signOut();
                setMoreMenuOpen(false);
              }}
              className="w-full flex items-center p-3 rounded-lg hover:bg-error-50 text-error-600 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-error-100 flex items-center justify-center mr-3">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <span className="text-base font-medium">Logout</span>
            </button>
          </div>
        </Modal>
      </div>
      <Toaster 
        position="top-center"
        toastOptions={{
          className: 'mt-14 md:mt-0',
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#1f2937',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          },
        }}
      />
    </>
  );
};