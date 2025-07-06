'use client'

import React from 'react'
import { useDrag } from '@use-gesture/react'
import { useSpring, animated } from '@react-spring/web'
import { Check, X, Trash2, Edit } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeAction {
  icon: React.ReactNode
  color: string
  action: () => void
}

interface SwipeableCardProps {
  children: React.ReactNode
  leftAction?: SwipeAction
  rightAction?: SwipeAction
  className?: string
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

export function SwipeableCard({
  children,
  leftAction,
  rightAction,
  className,
  onSwipeLeft,
  onSwipeRight,
}: SwipeableCardProps) {
  const [{ x }, api] = useSpring(() => ({ x: 0 }))
  const threshold = 80

  const bind = useDrag(
    ({ active, movement: [mx], cancel, last }) => {
      // Only allow horizontal swipes
      if (Math.abs(mx) < 10) return

      // If we're beyond threshold and released
      if (!active && last) {
        if (mx > threshold && rightAction) {
          api.start({
            x: window.innerWidth,
            immediate: false,
            config: { duration: 200 },
            onRest: () => {
              rightAction.action()
              onSwipeRight?.()
              api.start({ x: 0, immediate: true })
            },
          })
        } else if (mx < -threshold && leftAction) {
          api.start({
            x: -window.innerWidth,
            immediate: false,
            config: { duration: 200 },
            onRest: () => {
              leftAction.action()
              onSwipeLeft?.()
              api.start({ x: 0, immediate: true })
            },
          })
        } else {
          api.start({ x: 0, immediate: false })
        }
      } else {
        api.start({ x: active ? mx : 0, immediate: active })
      }
    },
    {
      axis: 'x',
      bounds: { left: leftAction ? -150 : 0, right: rightAction ? 150 : 0 },
      rubberband: true,
    }
  )

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      {/* Background actions */}
      {leftAction && (
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex items-center justify-start px-6',
            leftAction.color
          )}
        >
          {leftAction.icon}
        </div>
      )}
      {rightAction && (
        <div
          className={cn(
            'absolute inset-y-0 right-0 flex items-center justify-end px-6',
            rightAction.color
          )}
        >
          {rightAction.icon}
        </div>
      )}

      {/* Swipeable content */}
      <animated.div
        {...bind()}
        style={{ x }}
        className="relative touch-pan-y bg-card"
      >
        {children}
      </animated.div>
    </div>
  )
}

// Pre-configured swipeable cards for common use cases
export function SwipeableExpenseCard({
  children,
  onDelete,
  onEdit,
  className,
}: {
  children: React.ReactNode
  onDelete?: () => void
  onEdit?: () => void
  className?: string
}) {
  const leftAction: SwipeAction = {
    icon: <Trash2 className="h-6 w-6 text-white" />,
    color: 'bg-destructive',
    action: onDelete || (() => {}),
  }

  const rightAction: SwipeAction = {
    icon: <Edit className="h-6 w-6 text-white" />,
    color: 'bg-primary',
    action: onEdit || (() => {}),
  }

  return (
    <SwipeableCard
      leftAction={onDelete ? leftAction : undefined}
      rightAction={onEdit ? rightAction : undefined}
      className={className}
    >
      {children}
    </SwipeableCard>
  )
}

export function SwipeableTaskCard({
  children,
  onComplete,
  onDelete,
  className,
}: {
  children: React.ReactNode
  onComplete?: () => void
  onDelete?: () => void
  className?: string
}) {
  const leftAction: SwipeAction = {
    icon: <X className="h-6 w-6 text-white" />,
    color: 'bg-destructive',
    action: onDelete || (() => {}),
  }

  const rightAction: SwipeAction = {
    icon: <Check className="h-6 w-6 text-white" />,
    color: 'bg-success-DEFAULT',
    action: onComplete || (() => {}),
  }

  return (
    <SwipeableCard
      leftAction={onDelete ? leftAction : undefined}
      rightAction={onComplete ? rightAction : undefined}
      className={className}
    >
      {children}
    </SwipeableCard>
  )
}