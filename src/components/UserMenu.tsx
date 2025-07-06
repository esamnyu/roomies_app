'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Settings, LogOut } from 'lucide-react';

interface UserMenuProps {
  onProfileClick: () => void;
  onSettingsClick: () => void;
  onSignOut: () => void;
  householdSelected: boolean;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  onProfileClick,
  onSettingsClick,
  onSignOut,
  householdSelected
}) => {
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
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-2 rounded-full hover:bg-secondary"
      >
        <User className="h-5 w-5" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-background rounded-md shadow-lg py-1 z-50 border border-border">
          <button 
            onClick={() => { onProfileClick(); setIsOpen(false); }} 
            className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary flex items-center"
          >
            <User className="h-4 w-4 mr-2" /> My Profile
          </button>
          {householdSelected && (
            <button 
              onClick={() => { onSettingsClick(); setIsOpen(false); }} 
              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary flex items-center"
            >
              <Settings className="h-4 w-4 mr-2" /> Household Settings
            </button>
          )}
          <div className="border-t border-border my-1"></div>
          <button 
            onClick={onSignOut} 
            className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center"
          >
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </button>
        </div>
      )}
    </div>
  );
};