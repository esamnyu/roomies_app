'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, DollarSign, Calendar, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnimatedSuccessProps {
  show: boolean
  message?: string
  icon?: 'check' | 'dollar' | 'calendar' | 'sparkles'
  onComplete?: () => void
  className?: string
}

export function AnimatedSuccess({
  show,
  message = 'Success!',
  icon = 'check',
  onComplete,
  className,
}: AnimatedSuccessProps) {
  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 2000)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  const icons = {
    check: Check,
    dollar: DollarSign,
    calendar: Calendar,
    sparkles: Sparkles,
  }

  const Icon = icons[icon]

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm',
            className
          )}
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 15,
              delay: 0.1,
            }}
            className="bg-card rounded-2xl p-8 shadow-2xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 15,
                delay: 0.2,
              }}
              className="relative mx-auto h-20 w-20"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 0.5,
                  delay: 0.3,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 rounded-full bg-primary/20"
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 600,
                  damping: 10,
                  delay: 0.4,
                }}
                className="absolute inset-2 flex items-center justify-center rounded-full bg-primary"
              >
                <Icon className="h-8 w-8 text-primary-foreground" />
              </motion.div>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-4 text-center text-lg font-semibold text-foreground"
            >
              {message}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Inline success animation for forms
export function InlineSuccess({
  show,
  message = 'Saved!',
  className,
}: {
  show: boolean
  message?: string
  className?: string
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          className={cn('flex items-center gap-2 text-success-DEFAULT', className)}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 15,
            }}
          >
            <Check className="h-4 w-4" />
          </motion.div>
          <span className="text-sm font-medium">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}