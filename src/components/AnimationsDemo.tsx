'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/surfaces/Card'
import { AnimatedButton, SuccessButton } from '@/components/ui/AnimatedButton'
import { AnimatedSuccess, InlineSuccess } from '@/components/ui/AnimatedSuccess'
import { AnimatedCounter, AnimatedCurrencyCounter, AnimatedProgress } from '@/components/ui/AnimatedCounter'
import { AnimatedList } from '@/components/ui/AnimatedList'
import { Button } from '@/components/primitives/Button'
import { Input } from '@/components/primitives/Input'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function AnimationsDemo() {
  const [showSuccess, setShowSuccess] = useState(false)
  const [showInlineSuccess, setShowInlineSuccess] = useState(false)
  const [counterValue, setCounterValue] = useState(0)
  const [progressValue, setProgressValue] = useState(25)
  const [items, setItems] = useState([
    { id: 1, name: 'Milk', price: 4.99 },
    { id: 2, name: 'Bread', price: 2.49 },
    { id: 3, name: 'Eggs', price: 3.99 },
  ])
  const [newItem, setNewItem] = useState('')

  const handleAddItem = () => {
    if (newItem.trim()) {
      const item = {
        id: Date.now(),
        name: newItem,
        price: Math.random() * 10 + 1,
      }
      setItems([...items, item])
      setNewItem('')
      toast.success('Item added!')
    }
  }

  const handleDeleteItem = (id: number) => {
    setItems(items.filter(item => item.id !== id))
    toast.error('Item removed')
  }

  const total = items.reduce((sum, item) => sum + item.price, 0)

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Animations & Micro-interactions</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Delightful animations that enhance the user experience
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Success Animations */}
          <Card>
            <CardHeader>
              <CardTitle>Success States</CardTitle>
              <CardDescription>Different ways to show success feedback</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <AnimatedButton
                  onClick={() => setShowSuccess(true)}
                  variant="primary"
                  fullWidth
                >
                  Show Full Screen Success
                </AnimatedButton>
                <p className="text-sm text-muted-foreground">
                  Great for major actions like completing a payment
                </p>
              </div>

              <div className="space-y-2">
                <SuccessButton
                  variant="secondary"
                  fullWidth
                  successMessage="Saved!"
                  onClick={() => {
                    // Simulate async operation
                    return new Promise(resolve => setTimeout(resolve, 500))
                  }}
                >
                  Save Changes
                </SuccessButton>
                <p className="text-sm text-muted-foreground">
                  Button transforms to show success
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Enter your name"
                    onBlur={() => {
                      setShowInlineSuccess(true)
                      setTimeout(() => setShowInlineSuccess(false), 2000)
                    }}
                  />
                  <InlineSuccess show={showInlineSuccess} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Inline feedback for form fields
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Animated Counters */}
          <Card>
            <CardHeader>
              <CardTitle>Animated Numbers</CardTitle>
              <CardDescription>Smooth number transitions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="text-3xl font-bold">
                  <AnimatedCounter value={counterValue} />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setCounterValue(counterValue + 10)}
                  >
                    +10
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCounterValue(Math.max(0, counterValue - 10))}
                  >
                    -10
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-2xl font-semibold">
                  <AnimatedCurrencyCounter value={total} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Updates smoothly as items are added/removed
                </p>
              </div>

              <div className="space-y-2">
                <AnimatedProgress value={progressValue} />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setProgressValue(Math.min(100, progressValue + 25))}
                  >
                    Increase
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setProgressValue(Math.max(0, progressValue - 25))}
                  >
                    Decrease
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Animated List */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Animated Lists</CardTitle>
              <CardDescription>Items animate in and out smoothly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add new item..."
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                  />
                  <AnimatedButton
                    onClick={handleAddItem}
                    size="icon"
                    disabled={!newItem.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </AnimatedButton>
                </div>

                <AnimatedList
                  items={items}
                  keyExtractor={(item) => item.id}
                  animationType="slide"
                  className="space-y-2"
                  renderItem={(item) => (
                    <div className="flex items-center justify-between rounded-lg border bg-card p-4">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          <AnimatedCurrencyCounter value={item.price} />
                        </p>
                      </div>
                      <AnimatedButton
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteItem(item.id)}
                        hoverScale={1.1}
                        tapScale={0.9}
                      >
                        <Trash2 className="h-4 w-4" />
                      </AnimatedButton>
                    </div>
                  )}
                />

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold">Total:</p>
                    <p className="text-2xl font-bold">
                      <AnimatedCurrencyCounter value={total} />
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hover Effects */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Interactive Elements</CardTitle>
              <CardDescription>Hover and tap for delightful interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <AnimatedButton variant="primary">
                  Default Hover
                </AnimatedButton>
                <AnimatedButton variant="secondary" hoverScale={1.1}>
                  Bigger Hover
                </AnimatedButton>
                <AnimatedButton variant="accent" hoverScale={1.02} tapScale={0.98}>
                  Subtle Effect
                </AnimatedButton>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatedSuccess
        show={showSuccess}
        message="Payment Successful!"
        icon="dollar"
        onComplete={() => setShowSuccess(false)}
      />
    </div>
  )
}