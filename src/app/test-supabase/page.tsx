"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface TestResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: string;
}

export default function TestSupabase() {
  const [tests, setTests] = useState<TestResult[]>([
    { step: '1. Environment Variables', status: 'pending', message: 'Checking...' },
    { step: '2. URL Format', status: 'pending', message: 'Checking...' },
    { step: '3. Network Connectivity', status: 'pending', message: 'Checking...' },
    { step: '4. Supabase Client', status: 'pending', message: 'Checking...' },
    { step: '5. Database Connection', status: 'pending', message: 'Checking...' }
  ]);

  const updateTest = (index: number, update: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...update } : test));
  };

  useEffect(() => {
    const runTests = async () => {
      // Test 1: Environment Variables
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        updateTest(0, {
          status: 'error',
          message: 'Missing environment variables',
          details: `URL: ${supabaseUrl ? 'Set' : 'Missing'}, Key: ${supabaseKey ? 'Set' : 'Missing'}`
        });
        // Stop further tests if env vars are missing
        // To prevent further errors, ensure subsequent tests that depend on these don't run
        // or handle their absence gracefully. For simplicity here, we'll update remaining to error or skip.
        for (let i = 1; i < tests.length; i++) {
          updateTest(i, { status: 'error', message: 'Skipped due to missing environment variables.' });
        }
        return;
      }
      updateTest(0, { status: 'success', message: 'Environment variables found' });

      // Test 2: URL Format
      const urlPattern = /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/;
      if (!urlPattern.test(supabaseUrl)) {
        updateTest(1, {
          status: 'error',
          message: 'Invalid URL format',
          details: `Expected: https://your-project.supabase.co, Got: ${supabaseUrl}`
        });
        for (let i = 2; i < tests.length; i++) {
          updateTest(i, { status: 'error', message: 'Skipped due to invalid URL format.' });
        }
        return;
      }
      updateTest(1, { status: 'success', message: 'URL format is correct' });

      // Test 3: Network Connectivity
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
        
        if (!response.ok) {
          updateTest(2, {
            status: 'error',
            message: `Network request failed: ${response.status} ${response.statusText}`,
            details: `Check if your Supabase project is active and URL is correct`
          });
          for (let i = 3; i < tests.length; i++) {
            updateTest(i, { status: 'error', message: 'Skipped due to network connectivity issue.' });
          }
          return;
        }
        updateTest(2, { status: 'success', message: 'Network connectivity OK' });
      } catch (error) {
        updateTest(2, {
          status: 'error',
          message: 'Network request failed',
          details: error instanceof Error ? error.message : 'Unknown network error'
        });
        for (let i = 3; i < tests.length; i++) {
          updateTest(i, { status: 'error', message: 'Skipped due to network request failure.' });
        }
        return;
      }

      // Test 4: Supabase Client
      try {
        if (!supabase) {
          // This check might be redundant if '@/lib/supabase' always exports a client or throws.
          // However, it's good for explicit validation.
          throw new Error('Supabase client not initialized from @/lib/supabase');
        }
        updateTest(3, { status: 'success', message: 'Supabase client seems initialized' });
      } catch (error) {
        updateTest(3, {
          status: 'error',
          message: 'Supabase client error',
          details: error instanceof Error ? error.message : 'Unknown client error'
        });
        // If client isn't initialized, database connection test will also fail or throw.
        updateTest(4, { status: 'error', message: 'Skipped due to Supabase client error.' });
        return;
      }

      // Test 5: Database Connection (using Supabase client)
      try {
        // Ensure supabase client is available before using it
        if (!supabase) {
          updateTest(4, {
            status: 'error',
            message: 'Database connection cannot be tested',
            details: 'Supabase client is not available.'
          });
          return;
        }
        // Try a simple query. Using getSession is a light way to check auth/connection.
        const { error } = await supabase.auth.getSession(); 
        
        if (error) {
          updateTest(4, {
            status: 'error',
            message: 'Database connection/authentication failed',
            details: error.message
          });
          return;
        }
        
        updateTest(4, { status: 'success', message: 'Database connection and authentication successful' });
      } catch (error) {
        updateTest(4, {
          status: 'error',
          message: 'Database connection failed with an exception',
          details: error instanceof Error ? error.message : 'Unknown database error'
        });
      }
    };

    runTests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Added eslint-disable for exhaustive-deps as 'tests' is not a dependency here intentionally.

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Supabase Connection Diagnostics</h1>
      
      <div className="space-y-4">
        {tests.map((test, index) => (
          <div key={index} className={`bg-white rounded-lg shadow p-4 border-l-4 ${
            test.status === 'success' ? 'border-l-green-500' :
            test.status === 'error' ? 'border-l-red-500' :
            'border-l-gray-300' // pending
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">
                {getStatusIcon(test.status)} {test.step}
              </h3>
            </div>
            <p className="text-gray-700 mb-2">{test.message}</p>
            {test.details && (
              <div className="bg-gray-50 p-3 rounded text-sm mt-2">
                <strong>Details:</strong>
                <pre className="whitespace-pre-wrap break-all mt-1">{test.details}</pre>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Troubleshooting Tips</h3>
        <div className="space-y-3 text-sm">
          <div>
            <strong>1. Check Environment Variables:</strong>
            <p>Ensure your <code>.env.local</code> file (or your deployment environment variables) includes:</p>
            <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-auto">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_public_anon_key`}
            </pre>
            <p className="mt-1">Replace <code>your-project-ref</code> and <code>your_public_anon_key</code> with your actual Supabase project URL and anon key.</p>
          </div>
          <div>
            <strong>2. Verify Supabase Project Status:</strong>
            <p>Visit your <a href="https://supabase.com/dashboard" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">Supabase Dashboard</a> to confirm your project is active and there are no ongoing issues.</p>
          </div>
          <div>
            <strong>3. URL and Key Accuracy:</strong>
            <p>Double-check that the URL and anon key are copied correctly without typos or extra characters.</p>
          </div>
          <div>
            <strong>4. Network & RLS Policies:</strong>
            <p>Ensure your network allows connections to Supabase. Also, review your Row Level Security (RLS) policies on Supabase to ensure they aren't unintentionally blocking access for the operations you're testing (though <code>getSession</code> should generally work even with restrictive RLS for data tables).</p>
          </div>
          <div>
            <strong>5. Restart Development Server:</strong>
            <p>If you recently modified <code>.env.local</code>, remember to restart your Next.js development server (e.g., <code>npm run dev</code> or <code>yarn dev</code>).</p>
          </div>
        </div>
      </div>
    </div>
  );
}