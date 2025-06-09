// src/components/AddTaskModal.tsx
"use client";

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import * as api from '@/lib/api';
import { toast } from 'react-hot-toast';
import type { HouseholdMember } from '@/lib/api';

interface AddTaskModalProps {
  householdId: string;
  members: HouseholdMember[];
  onClose: () => void;
  onTaskAdded: () => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ householdId, members, onClose, onTaskAdded }) => {
    const [title, setTitle] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [submitting, setSubmitting] = useState(false);
    
    const handleSubmit = async () => {
      if (!title || !householdId) return;
      setSubmitting(true);
      try {
        await api.createTask(householdId, title, assignedTo || undefined);
        onTaskAdded();
        onClose();
        toast.success('Task added!');
      } catch (error) { console.error('Error creating task:', error); toast.error((error as Error).message || 'Failed to create task'); }
      finally { setSubmitting(false); }
    };

    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Task</h3>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700">Task</label><input type="text" className="mt-1 w-full input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><label className="block text-sm font-medium text-gray-700">Assign to (optional)</label><select className="mt-1 w-full input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}><option value="">Unassigned</option>{members.map(member => (<option key={member.user_id} value={member.user_id}>{member.profiles?.name}</option>))}</select></div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button onClick={onClose} className="btn-secondary" disabled={submitting}>Cancel</button>
            <button onClick={handleSubmit} disabled={submitting || !title} className="btn-primary">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Task'}
            </button>
          </div>
        </div>
      </div>
    );
};