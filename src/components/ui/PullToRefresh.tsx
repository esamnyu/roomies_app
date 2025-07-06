'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useDrag } from '@use-gesture/react'
import { useSpring, animated } from '@react-spring/web'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  threshold?: number
  className?: string
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  className,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [{ y, rotate }, api] = useSpring(() => ({
    y: 0,
    rotate: 0,
  }))

  const bind = useDrag(
    async ({ active, movement: [, my], cancel, memo = { start: 0 } }) => {
      // Only allow pull down when at the top of the scroll
      if (!containerRef.current) return memo
      
      const scrollTop = containerRef.current.scrollTop
      
      // If we're not at the top, don't allow pull to refresh
      if (scrollTop > 0) {
        cancel()
        return memo
      }

      // Only respond to downward movement
      if (my < 0) {
        api.start({ y: 0, rotate: 0 })
        return memo
      }

      // Calculate the pull progress
      const progress = Math.min(my / threshold, 1)
      
      if (active) {
        // While dragging
        api.start({
          y: Math.min(my, threshold * 1.5),
          rotate: progress * 180,
          immediate: true,
        })
      } else {
        // When released
        if (my >= threshold && !isRefreshing) {
          // Trigger refresh
          setIsRefreshing(true)
          api.start({
            y: threshold,
            rotate: 360,
            immediate: false,
            config: { duration: 200 },
          })
          
          try {
            await onRefresh()
          } finally {
            setIsRefreshing(false)
            api.start({
              y: 0,
              rotate: 0,
              immediate: false,
              config: { duration: 300 },
            })
          }
        } else {
          // Snap back
          api.start({
            y: 0,
            rotate: 0,
            immediate: false,
            config: { duration: 200 },
          })
        }
      }
      
      return memo
    },
    {
      axis: 'y',
      filterTaps: true,
      from: () => [0, y.get()],
    }
  )

  useEffect(() => {
    if (isRefreshing) {
      // Continuous rotation while refreshing
      const interval = setInterval(() => {
        api.start({
          rotate: rotate.get() + 180,
          immediate: false,
          config: { duration: 500 },
        })
      }, 500)
      
      return () => clearInterval(interval)
    }
  }, [isRefreshing, api, rotate])

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Pull indicator */}
      <animated.div
        style={{
          transform: y.to(y => `translateY(${y}px)`),
          opacity: y.to(y => Math.min(y / threshold, 1)),
        }}
        className="absolute left-0 right-0 top-0 flex items-center justify-center py-4"
      >
        <animated.div
          style={{
            transform: rotate.to(r => `rotate(${r}deg)`),
          }}
        >
          <RefreshCw 
            className={cn(
              'h-6 w-6 transition-colors',
              isRefreshing ? 'text-primary' : 'text-muted-foreground'
            )}
          />
        </animated.div>
      </animated.div>

      {/* Content */}
      <animated.div
        {...bind()}
        ref={containerRef}
        style={{
          transform: y.to(y => `translateY(${y}px)`),
        }}
        className="h-full overflow-auto overscroll-none"
      >
        {children}
      </animated.div>
    </div>
  )
}

// Hook for programmatic refresh
export function usePullToRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const refresh = async (callback: () => Promise<void>) => {
    if (isRefreshing) return
    
    setIsRefreshing(true)
    try {
      await callback()
    } finally {
      setIsRefreshing(false)
    }
  }
  
  return { isRefreshing, refresh }
}