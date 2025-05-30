"use client";
import { useEffect, useState } from 'react';

interface NetworkTest {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: string;
}

export default function DetailedNetworkTest() {
  const [tests, setTests] = useState<NetworkTest[]>([
    { name: 'Basic URL Accessibility', status: 'pending', message: 'Testing...' },
    { name: 'CORS Headers', status: 'pending', message: 'Testing...' },
    { name: 'API Endpoint', status: 'pending', message: 'Testing...' },
    { name: 'Auth Endpoint', status: 'pending', message: 'Testing...' },
    { name: 'API Key Validation', status: 'pending', message: 'Testing...' }
  ]);

  const updateTest = (index: number, update: Partial<NetworkTest>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...update } : test));
  };

  useEffect(() => {
    const runNetworkTests = async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      // Test 1: Basic URL accessibility
      try {
        console.log('Testing basic URL accessibility...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(supabaseUrl, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        updateTest(0, {
          status: 'success',
          message: `URL accessible (${response.status})`,
          details: `Status: ${response.status} ${response.statusText}`
        });
      } catch (error) {
        console.error('Basic URL test error:', error);
        updateTest(0, {
          status: 'error',
          message: 'URL not accessible',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // If basic URL fails, likely the project is inactive
        updateTest(1, { status: 'error', message: 'Skipped - basic URL failed' });
        updateTest(2, { status: 'error', message: 'Skipped - basic URL failed' });
        updateTest(3, { status: 'error', message: 'Skipped - basic URL failed' });
        updateTest(4, { status: 'error', message: 'Skipped - basic URL failed' });
        return;
      }

      // Test 2: CORS Headers
      try {
        console.log('Testing CORS headers...');
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'OPTIONS'
        });
        
        const corsHeaders = {
          'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
          'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
          'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
        };
        
        updateTest(1, {
          status: 'success',
          message: 'CORS headers present',
          details: JSON.stringify(corsHeaders, null, 2)
        });
      } catch (error) {
        console.error('CORS test error:', error);
        updateTest(1, {
          status: 'error',
          message: 'CORS test failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Test 3: API Endpoint with proper headers
      try {
        console.log('Testing API endpoint...');
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          updateTest(2, {
            status: 'success',
            message: 'API endpoint accessible',
            details: `Status: ${response.status}, Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`
          });
        } else {
          const errorText = await response.text();
          updateTest(2, {
            status: 'error',
            message: `API endpoint error: ${response.status}`,
            details: `${response.statusText}: ${errorText}`
          });
        }
      } catch (error) {
        console.error('API endpoint test error:', error);
        updateTest(2, {
          status: 'error',
          message: 'API endpoint failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Test 4: Auth Endpoint
      try {
        console.log('Testing auth endpoint...');
        const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        });
        
        updateTest(3, {
          status: response.ok ? 'success' : 'error',
          message: response.ok ? 'Auth endpoint accessible' : `Auth endpoint error: ${response.status}`,
          details: `Status: ${response.status} ${response.statusText}`
        });
      } catch (error) {
        console.error('Auth endpoint test error:', error);
        updateTest(3, {
          status: 'error',
          message: 'Auth endpoint failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Test 5: API Key Validation
      try {
        console.log('Testing API key validation...');
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'GET',
          headers: {
            'apikey': 'invalid-key',
            'Authorization': 'Bearer invalid-key'
          }
        });
        
        if (response.status === 401) {
          updateTest(4, {
            status: 'success',
            message: 'API key validation working (rejected invalid key)',
            details: 'Server correctly rejected invalid API key'
          });
        } else {
          updateTest(4, {
            status: 'error',
            message: 'API key validation issue',
            details: `Expected 401, got ${response.status}`
          });
        }
      } catch (error) {
        console.error('API key validation test error:', error);
        updateTest(4, {
          status: 'error',
          message: 'API key validation test failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    runNetworkTests();
  }, []);

  const getStatusIcon = (status: NetworkTest['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Detailed Network Connectivity Test</h1>
      
      <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold mb-2">Your Configuration:</h3>
        <p className="text-sm"><strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
        <p className="text-sm"><strong>Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...</p>
      </div>
      
      <div className="space-y-4">
        {tests.map((test, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-4 border-l-4 border-l-gray-300">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">
                {getStatusIcon(test.status)} {test.name}
              </h3>
            </div>
            <p className="text-gray-700 mb-2">{test.message}</p>
            {test.details && (
              <div className="bg-gray-50 p-3 rounded text-sm overflow-auto">
                <strong>Details:</strong>
                <pre className="mt-1 whitespace-pre-wrap">{test.details}</pre>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-red-800">Common Solutions for "Load failed":</h3>
        <div className="space-y-3 text-sm">
          <div>
            <strong>1. Supabase Project Paused/Inactive:</strong>
            <p>Go to <a href="https://supabase.com/dashboard/project/utpjefooyqaqdhpgzxjy" className="text-blue-600 underline" target="_blank">your project dashboard</a> and check if it's paused or needs to be restored.</p>
          </div>
          <div>
            <strong>2. Project Deleted:</strong>
            <p>If the project was deleted, you'll need to create a new one and update your environment variables.</p>
          </div>
          <div>
            <strong>3. Network/Firewall Issues:</strong>
            <p>Check if your network or corporate firewall is blocking connections to *.supabase.co</p>
          </div>
          <div>
            <strong>4. Try Manual Test:</strong>
            <p>Open <a href="https://utpjefooyqaqdhpgzxjy.supabase.co" className="text-blue-600 underline" target="_blank">https://utpjefooyqaqdhpgzxjy.supabase.co</a> in your browser to see if it loads.</p>
          </div>
        </div>
      </div>
    </div>
  );
}