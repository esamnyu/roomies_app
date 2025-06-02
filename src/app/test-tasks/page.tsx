// Create: src/app/test-tasks/page.tsx
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestTasks() {
  const [tests, setTests] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [households, setHouseholds] = useState<any[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState('');

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

      // Test 2: Get user's households
      if (user) {
        const { data: memberData, error: memberError } = await supabase
          .from('household_members')
          .select(`
            *,
            households (*)
          `)
          .eq('user_id', user.id);

        if (memberError) throw memberError;
        
        const householdList = memberData?.map(m => m.households) || [];
        setHouseholds(householdList);
        
        results.push({
          test: 'Get Households',
          status: 'success',
          message: `Found ${householdList.length} households`,
          data: householdList
        });

        if (householdList.length > 0) {
          setSelectedHousehold(householdList[0].id);
        }
      }
    } catch (error: any) {
      results.push({
        test: 'Authentication/Households',
        status: 'error',
        message: error.message,
        data: error
      });
    }

    // Test 3: Check tasks table structure
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .limit(1);

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
        throw error;
      }

      results.push({
        test: 'Tasks Table Access',
        status: 'success',
        message: 'Can access tasks table',
        data: data
      });
    } catch (error: any) {
      results.push({
        test: 'Tasks Table Access',
        status: 'error',
        message: error.message,
        data: error
      });
    }

    setTests(results);
  };

  const testCreateTask = async () => {
    if (!selectedHousehold) {
      alert('Please select a household first');
      return;
    }

    const newTests = [...tests];

    try {
      // Test simple task creation
      const taskData = {
        household_id: selectedHousehold,
        title: `Test Task ${new Date().toISOString()}`,
        completed: false
      };

      console.log('Attempting to create task with data:', taskData);

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) {
        console.error('Full error object:', error);
        throw error;
      }

      newTests.push({
        test: 'Create Task',
        status: 'success',
        message: 'Task created successfully',
        data: data
      });
    } catch (error: any) {
      newTests.push({
        test: 'Create Task',
        status: 'error',
        message: error.message || 'Unknown error',
        data: {
          code: error.code,
          details: error.details,
          hint: error.hint,
          message: error.message
        }
      });
    }

    setTests(newTests);
  };

  const testRLS = async () => {
    if (!user) return;

    const newTests = [...tests];

    try {
      // Check if RLS is enabled
      const { data: policies, error } = await supabase
        .rpc('get_policies', { schema_name: 'public', table_name: 'tasks' })
        .select();

      newTests.push({
        test: 'RLS Policies Check',
        status: error ? 'error' : 'success',
        message: error ? error.message : `Found ${policies?.length || 0} policies`,
        data: policies || error
      });
    } catch (error: any) {
      // This RPC might not exist, so we'll try a different approach
      newTests.push({
        test: 'RLS Policies Check',
        status: 'info',
        message: 'Cannot directly check RLS policies',
        data: null
      });
    }

    setTests(newTests);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Task Creation Diagnostics</h1>

      {user && (
        <div className="mb-6 p-4 bg-blue-50 rounded">
          <p><strong>Logged in as:</strong> {user.email}</p>
          <p><strong>User ID:</strong> {user.id}</p>
        </div>
      )}

      {households.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Household:</label>
          <select
            value={selectedHousehold}
            onChange={(e) => setSelectedHousehold(e.target.value)}
            className="w-full p-2 border rounded"
          >
            {households.map((h: any) => (
              <option key={h.id} value={h.id}>
                {h.name} (ID: {h.id})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-6 space-x-4">
        <button
          onClick={testCreateTask}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={!selectedHousehold}
        >
          Test Create Task
        </button>
        <button
          onClick={testRLS}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Test RLS Policies
        </button>
        <button
          onClick={runTests}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Re-run Initial Tests
        </button>
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
        <h3 className="font-semibold mb-2">Common Task Creation Issues:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Foreign Key Constraint:</strong> The household_id must exist in the households table</li>
          <li><strong>RLS Policies:</strong> Row Level Security might be preventing inserts</li>
          <li><strong>Missing Columns:</strong> The tasks table might have required columns not being provided</li>
          <li><strong>User Permissions:</strong> The user might not have permission to create tasks in the household</li>
        </ul>
      </div>
    </div>
  );
}