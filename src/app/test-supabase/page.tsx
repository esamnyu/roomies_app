"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestSupabase() {
  const [status, setStatus] = useState<string>('Testing connection...');

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('count');
        if (error) throw error;
        setStatus('✅ Connected to Supabase!');
      } catch (error) {
        // Type guard to handle the error safely
        if (error instanceof Error) {
          setStatus(`❌ Connection failed: ${error.message}`);
        } else {
          setStatus(`❌ Connection failed: ${String(error)}`);
        }
      }
    };
    testConnection();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      <p>{status}</p>
    </div>
  );
}