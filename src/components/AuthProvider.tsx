"use client";
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/api';
import * as api from '@/lib/api';

interface AuthContextType {
  user: User | null;
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const getInitialSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
    setLoading(false);
  };

  getInitialSession();

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
    setUser(session?.user ?? null);
    if (session?.user) {
      await fetchProfile(session.user.id);
    } else {
      setProfile(null);
    }
  });

  return () => {
    subscription?.unsubscribe();
  };
}, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await api.getProfile(userId);
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // It's often good practice to clear the profile on error
      setProfile(null);
    }
  };

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
      const { error } = await api.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

const value = useMemo(() => ({
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut
  }), [user, profile, loading, signIn, signUp, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};