// Create: src/app/clean-test/page.tsx
"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function CleanTest() {
  const [result, setResult] = useState<string>('Starting clean test...');
  const [details, setDetails] = useState<string>('');

  useEffect(() => {
    const runCleanTest = async () => {
      try {
        // Wait a moment to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setResult('Testing basic connection...');
        
        // Test 1: Simple health check (no auth required)
        const healthUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
        const healthResponse = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            'Content-Type': 'application/json'
          }
        });
        
        if (!healthResponse.ok) {
          setResult(`❌ API connection failed: ${healthResponse.status} ${healthResponse.statusText}`);
          setDetails(await healthResponse.text());
          return;
        }
        
        setResult('✅ API connection successful! Testing auth...');
        
        // Test 2: Simple auth test (just get session, no login)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setResult(`❌ Auth error: ${error.message}`);
          setDetails(JSON.stringify(error, null, 2));
          return;
        }
        
        setResult('✅ Everything working! Connection successful!');
        setDetails(`Session status: ${session ? 'Logged in' : 'Not logged in (normal for first visit)'}`);
        
      } catch (error) {
        setResult(`❌ Unexpected error: ${error}`);
        setDetails(error instanceof Error ? error.stack || error.message : 'Unknown error');
      }
    };

    runCleanTest();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Clean Connection Test</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Test Result</h2>
        <p className="text-lg mb-4">{result}</p>
        {details && (
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">Details:</h3>
            <pre className="text-sm overflow-auto">{details}</pre>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Current Configuration:</h3>
        <p className="text-sm mb-1"><strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
        <p className="text-sm"><strong>Key starts with:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...</p>
        <p className="text-sm"><strong>Key length:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length} characters</p>
      </div>
    </div>
  );
}