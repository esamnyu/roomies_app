import { useState, useEffect } from 'react';
import { getHouseholdTasks, createTask, updateTask, deleteTask } from '@/lib/api/tasks';
import type { Task } from '@/lib/types/types';
import { toast } from 'react-hot-toast';

export const useTasks = (householdId: string) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      const fetchedTasks = await getHouseholdTasks(householdId);
      // Check if fetchedTasks is an array before filtering
      if (!Array.isArray(fetchedTasks)) {
        console.error('Invalid tasks data received:', fetchedTasks);
        setTasks([]);
        return;
      }
      
      // Filter out completed tasks older than 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const filteredTasks = fetchedTasks.filter((task: Task) => {
        if (!task.completed) return true;
        if (!task.completed_at) return true;
        return new Date(task.completed_at) > sevenDaysAgo;
      });
      
      setTasks(filteredTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
      setTasks([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new task
  const addTask = async (title: string, assignedTo?: string) => {
    try {
      const newTask = await createTask(householdId, title, assignedTo);
      console.log('New task created:', newTask);
      setTasks((prev) => [newTask, ...prev]);
      toast.success('Task added');
      return newTask;
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to add task');
      throw error;
    }
  };

  // Toggle task completion
  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const updatedTask = await updateTask(taskId, {
        completed: !task.completed,
        completed_at: !task.completed ? new Date().toISOString() : undefined
      });
      
      setTasks((prev) => prev.map((t) => 
        t.id === taskId ? updatedTask : t
      ));
      
      if (updatedTask.completed) {
        toast.success('Task completed!');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  // Delete a task
  const removeTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success('Task removed');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to remove task');
    }
  };

  // Initial fetch
  useEffect(() => {
    if (householdId) {
      fetchTasks();
    }
  }, [householdId]);

  // Refresh completed tasks periodically to handle auto-cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      if (householdId && tasks.some(t => t.completed)) {
        fetchTasks();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [householdId, tasks]);

  return {
    tasks,
    isLoading,
    addTask,
    toggleTask,
    removeTask,
    refetch: fetchTasks
  };
};