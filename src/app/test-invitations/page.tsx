"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import * as api from '@/lib/api';

export default function TestInvitations() {
  const [tests, setTests] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testHouseholdId, setTestHouseholdId] = useState('');

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    const results = [];

    // Test 1: Check authentication
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      setUser(user);
      results.push({
        test: 'Authentication',
        status: 'success',
        message: `Logged in as ${user?.email}`,
        data: user
      });
    } catch (error: any) {
      results.push({
        test: 'Authentication',
        status: 'error',
        message: error.message,
        data: error
      });
    }

    // Test 2: Check invitations table directly
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .limit(5);

      results.push({
        test: 'Invitations Table Direct Query',
        status: error ? 'error' : 'success',
        message: error ? error.message : `Found ${data?.length || 0} invitations`,
        data: data || error
      });
    } catch (error: any) {
      results.push({
        test: 'Invitations Table Direct Query',
        status: 'error',
        message: error.message,
        data: error
      });
    }

    // Test 3: Check user's invitations
    if (user) {
      try {
        const { data, error } = await supabase
          .from('invitations')
          .select('*')
          .eq('email', user.email?.toLowerCase() || '');

        results.push({
          test: 'User Invitations Query',
          status: error ? 'error' : 'success',
          message: error ? error.message : `Found ${data?.length || 0} invitations for ${user.email}`,
          data: data || error
        });
      } catch (error: any) {
        results.push({
          test: 'User Invitations Query',
          status: 'error',
          message: error.message,
          data: error
        });
      }
    }

    // Test 4: Check profiles table
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .limit(5);

      results.push({
        test: 'Profiles Table Structure',
        status: error ? 'error' : 'success',
        message: error ? error.message : `Found ${data?.length || 0} profiles`,
        data: data || error
      });
    } catch (error: any) {
      results.push({
        test: 'Profiles Table Structure',
        status: 'error',
        message: error.message,
        data: error
      });
    }

    // Test 5: Check RPC functions
    try {
      const { data, error } = await supabase.rpc('get_policies', { 
        schema_name: 'public', 
        table_name: 'invitations' 
      });

      results.push({
        test: 'RPC Functions Available',
        status: error ? 'error' : 'success',
        message: error ? error.message : 'RPC functions accessible',
        data: { available: !error }
      });
    } catch (error: any) {
      results.push({
        test: 'RPC Functions Available',
        status: 'error',
        message: error.message,
        data: error
      });
    }

    setTests(results);
  };

  const testGetPendingInvitations = async () => {
    const newTests = [...tests];

    try {
      const invitations = await api.getPendingInvitations();
      
      newTests.push({
        test: 'Get Pending Invitations API',
        status: 'success',
        message: `Found ${invitations.length} pending invitations`,
        data: invitations
      });
    } catch (error: any) {
      newTests.push({
        test: 'Get Pending Invitations API',
        status: 'error',
        message: error.message,
        data: error
      });
    }

    setTests(newTests);
  };

  const testCreateInvitation = async () => {
    if (!testHouseholdId || !testEmail) {
      alert('Please enter both household ID and email');
      return;
    }

    const newTests = [...tests];

    try {
      const result = await api.createInvitation(testHouseholdId, testEmail);
      
      newTests.push({
        test: 'Create Invitation',
        status: 'success',
        message: 'Invitation created successfully',
        data: result
      });
    } catch (error: any) {
      newTests.push({
        test: 'Create Invitation',
        status: 'error',
        message: error.message,
        data: error
      });
    }

    setTests(newTests);
  };

  const debugInvitationSystem = async () => {
    const newTests = [...tests];

    try {
      const debugInfo = await api.debugInvitationSystem();
      
      newTests.push({
        test: 'Debug Invitation System',
        status: 'success',
        message: 'Debug info collected',
        data: debugInfo
      });
    } catch (error: any) {
      newTests.push({
        test: 'Debug Invitation System',
        status: 'error',
        message: error.message,
        data: error
      });
    }

    setTests(newTests);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Invitation System Diagnostics</h1>

      {user && (
        <div className="mb-6 p-4 bg-blue-50 rounded">
          <p><strong>Logged in as:</strong> {user.email}</p>
          <p><strong>User ID:</strong> {user.id}</p>
        </div>
      )}

      <div className="mb-6 space-y-4">
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Household ID"
            value={testHouseholdId}
            onChange={(e) => setTestHouseholdId(e.target.value)}
            className="px-3 py-2 border rounded"
          />
          <input
            type="email"
            placeholder="Email to invite"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="px-3 py-2 border rounded"
          />
        </div>

        <div className="space-x-4">
          <button
            onClick={testGetPendingInvitations}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test Get Pending Invitations
          </button>
          <button
            onClick={testCreateInvitation}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Test Create Invitation
          </button>
          <button
            onClick={debugInvitationSystem}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Debug Invitation System
          </button>
          <button
            onClick={runTests}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Re-run Initial Tests
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {tests.map((test, index) => (
          <div
            key={index}
            className={`p-4 rounded border ${
              test.status === 'success' ? 'bg-green-50 border-green-300' :
              test.status === 'error' ? 'bg-red-50 border-red-300' :
              'bg-gray-50 border-gray-300'
            }`}
          >
            <h3 className="font-semibold mb-2">
              {test.status === 'success' ? '✅' : test.status === 'error' ? '❌' : 'ℹ️'} {test.test}
            </h3>
            <p className="text-sm mb-2">{test.message}</p>
            {test.data && (
              <details className="text-xs">
                <summary className="cursor-pointer">View Details</summary>
                <pre className="mt-2 p-2 bg-white rounded overflow-auto">
                  {JSON.stringify(test.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold mb-2">Common Invitation Issues:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Email Case Sensitivity:</strong> Emails should be stored in lowercase</li>
          <li><strong>Missing Profile Email:</strong> The profiles table might not have email column populated</li>
          <li><strong>Foreign Key Issues:</strong> The invitation joins might be using wrong foreign key names</li>
          <li><strong>RLS Policies:</strong> Row Level Security might be blocking access</li>
          <li><strong>Expired Invitations:</strong> Check the expires_at timestamp</li>
        </ul>
      </div>
    </div>
  );
}