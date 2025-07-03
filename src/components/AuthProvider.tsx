"use client";
import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types/types';
import * as api from '@/lib/api';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  signInWithGoogle: async () => ({ error: null }),
  signInWithPhone: async () => ({ error: null }),
  verifyOtp: async () => ({ error: null }),
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

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const profileData = await api.getProfile(userId);
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await api.signIn(email, password);
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const { error } = await api.signUp(email, password, name);
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await api.signOut();
    setProfile(null);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await api.signInWithGoogle();
    return { error };
  }, []);

  const signInWithPhone = useCallback(async (phone: string) => {
    const { error } = await api.signInWithPhone(phone);
    return { error };
  }, []);

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    const { error } = await api.verifyOtp(phone, token);
    return { error };
  }, []);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithPhone,
    verifyOtp
  }), [user, profile, loading, signIn, signUp, signOut, signInWithGoogle, signInWithPhone, verifyOtp]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};