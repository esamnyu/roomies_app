'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/surfaces/Card'
import { Button } from '@/components/primitives/Button'
import { SwipeableExpenseCard, SwipeableTaskCard } from '@/components/ui/SwipeableCard'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { BottomSheet, useBottomSheet } from '@/components/ui/BottomSheet'
import { DollarSign, Calendar, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export function MobileGesturesDemo() {
  const [expenses, setExpenses] = useState([
    { id: 1, description: 'Groceries', amount: 45.99, date: '2024-01-20' },
    { id: 2, description: 'Utilities', amount: 120.00, date: '2024-01-19' },
    { id: 3, description: 'Internet', amount: 59.99, date: '2024-01-18' },
  ])

  const [tasks, setTasks] = useState([
    { id: 1, title: 'Take out trash', completed: false },
    { id: 2, title: 'Clean kitchen', completed: false },
    { id: 3, title: 'Vacuum living room', completed: false },
  ])

  const bottomSheet = useBottomSheet()
  const [selectedItem, setSelectedItem] = useState<any>(null)

  const handleRefresh = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    toast.success('Data refreshed!')
  }

  const handleDeleteExpense = (id: number) => {
    setExpenses(prev => prev.filter(e => e.id !== id))
    toast.success('Expense deleted')
  }

  const handleEditExpense = (expense: any) => {
    setSelectedItem(expense)
    bottomSheet.open()
  }

  const handleCompleteTask = (id: number) => {
    setTasks(prev => 
      prev.map(t => t.id === id ? { ...t, completed: true } : t)
    )
    toast.success('Task completed!')
  }

  const handleDeleteTask = (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    toast.error('Task deleted')
  }

  return (
    <div className="min-h-screen bg-background">
      <PullToRefresh onRefresh={handleRefresh} className="h-screen">
        <div className="p-4 pb-safe space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mobile Gestures Demo</h1>
            <p className="mt-2 text-muted-foreground">
              Try swiping cards, pulling to refresh, and tapping buttons
            </p>
          </div>

          {/* Swipeable Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>Swipe left to delete, right to edit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 -mx-4 px-4">
              {expenses.map(expense => (
                <SwipeableExpenseCard
                  key={expense.id}
                  onDelete={() => handleDeleteExpense(expense.id)}
                  onEdit={() => handleEditExpense(expense)}
                  className="shadow-sm"
                >
                  <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        <p className="text-sm text-muted-foreground">{expense.date}</p>
                      </div>
                    </div>
                    <p className="font-semibold">${expense.amount.toFixed(2)}</p>
                  </div>
                </SwipeableExpenseCard>
              ))}
            </CardContent>
          </Card>

          {/* Swipeable Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Tasks</CardTitle>
              <CardDescription>Swipe right to complete, left to delete</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 -mx-4 px-4">
              {tasks.filter(t => !t.completed).map(task => (
                <SwipeableTaskCard
                  key={task.id}
                  onComplete={() => handleCompleteTask(task.id)}
                  onDelete={() => handleDeleteTask(task.id)}
                  className="shadow-sm"
                >
                  <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-secondary/10 rounded-lg">
                        <Calendar className="h-5 w-5 text-secondary-foreground" />
                      </div>
                      <p className="font-medium">{task.title}</p>
                    </div>
                    <Check className="h-5 w-5 text-muted-foreground" />
                  </div>
                </SwipeableTaskCard>
              ))}
            </CardContent>
          </Card>

          {/* Bottom Sheet Demo */}
          <Card>
            <CardHeader>
              <CardTitle>Bottom Sheet</CardTitle>
              <CardDescription>A mobile-friendly alternative to modals</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={bottomSheet.open} fullWidth>
                Open Bottom Sheet
              </Button>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card variant="outlined">
            <CardHeader>
              <CardTitle>Gesture Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>📱 <strong>Pull down</strong> from the top to refresh</p>
              <p>👆 <strong>Swipe left</strong> on expenses to delete</p>
              <p>👆 <strong>Swipe right</strong> on expenses to edit</p>
              <p>✅ <strong>Swipe right</strong> on tasks to complete</p>
              <p>❌ <strong>Swipe left</strong> on tasks to delete</p>
              <p>📋 <strong>Drag up/down</strong> on bottom sheet to resize</p>
            </CardContent>
          </Card>
        </div>
      </PullToRefresh>

      {/* Bottom Sheet */}
      <BottomSheet
        isOpen={bottomSheet.isOpen}
        onClose={bottomSheet.close}
        title={selectedItem ? 'Edit Expense' : 'Bottom Sheet Demo'}
        snapPoints={[0.4, 0.85]}
      >
        <div className="py-6 space-y-4">
          {selectedItem ? (
            <>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-lg font-semibold">{selectedItem.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Amount</label>
                <p className="text-lg font-semibold">${selectedItem.amount.toFixed(2)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date</label>
                <p className="text-lg font-semibold">{selectedItem.date}</p>
              </div>
              <div className="pt-4 space-y-2">
                <Button fullWidth>Save Changes</Button>
                <Button variant="ghost" fullWidth onClick={bottomSheet.close}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                This is a mobile-optimized bottom sheet that slides up from the bottom
                of the screen. It's perfect for forms, menus, and other content that
                would traditionally use a modal.
              </p>
              <p className="text-muted-foreground">
                Try dragging it up and down to see how it snaps to different heights!
              </p>
              <Button variant="outline" fullWidth onClick={bottomSheet.close}>
                Close
              </Button>
            </>
          )}
        </div>
      </BottomSheet>
    </div>
  )
}