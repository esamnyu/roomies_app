'use client'

import React, { useEffect, useRef } from 'react'
import { useDrag } from '@use-gesture/react'
import { useSpring, animated } from '@react-spring/web'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createPortal } from 'react-dom'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  className?: string
  snapPoints?: number[]
  defaultSnap?: number
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  className,
  snapPoints = [0.5, 0.9],
  defaultSnap = 0,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = React.useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800
  const snapHeights = snapPoints.map(point => windowHeight * point)
  
  const [{ y }, api] = useSpring(() => ({
    y: windowHeight,
    config: { tension: 300, friction: 30 },
  }))

  useEffect(() => {
    if (isOpen) {
      api.start({ y: windowHeight - snapHeights[defaultSnap] })
    } else {
      api.start({ y: windowHeight })
    }
  }, [isOpen, api, windowHeight, snapHeights, defaultSnap])

  const bind = useDrag(
    ({ active, movement: [, my], velocity: [, vy], direction: [, dy], cancel }) => {
      if (!sheetRef.current) return

      // If swiping down fast, close
      if (!active && vy > 0.5 && dy > 0) {
        onClose()
        return
      }

      // Find closest snap point
      if (!active) {
        const currentY = y.get()
        const currentHeight = windowHeight - currentY
        
        let closestSnap = 0
        let minDistance = Infinity
        
        snapHeights.forEach((height, index) => {
          const distance = Math.abs(currentHeight - height)
          if (distance < minDistance) {
            minDistance = distance
            closestSnap = index
          }
        })

        // If dragged below minimum snap, close
        if (currentHeight < snapHeights[0] * 0.5) {
          onClose()
        } else {
          api.start({ y: windowHeight - snapHeights[closestSnap] })
        }
      } else {
        api.start({ y: my + (windowHeight - snapHeights[defaultSnap]), immediate: true })
      }
    },
    {
      from: () => [0, y.get()],
      filterTaps: true,
      bounds: { top: 0 },
      rubberband: true,
    }
  )

  if (!mounted) return null

  const content = (
    <>
      {/* Backdrop */}
      <animated.div
        className="fixed inset-0 bg-black/50 z-40"
        style={{
          opacity: y.to([windowHeight - snapHeights[snapHeights.length - 1], windowHeight], [1, 0]),
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <animated.div
        ref={sheetRef}
        style={{
          transform: y.to(y => `translateY(${y}px)`),
        }}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-2xl shadow-xl',
          className
        )}
      >
        {/* Handle */}
        <div
          {...bind()}
          className="flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing"
        >
          <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 pb-4 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-6 pb-safe overflow-auto" style={{ maxHeight: snapHeights[snapHeights.length - 1] - 80 }}>
          {children}
        </div>
      </animated.div>
    </>
  )

  return createPortal(content, document.body)
}

// Hook for managing bottom sheet state
export function useBottomSheet() {
  const [isOpen, setIsOpen] = React.useState(false)
  
  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)
  const toggle = () => setIsOpen(prev => !prev)
  
  return { isOpen, open, close, toggle }
}