'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedListProps<T> {
  items: T[]
  keyExtractor: (item: T) => string | number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  staggerDelay?: number
  animationType?: 'fade' | 'slide' | 'scale'
}

export function AnimatedList<T>({
  items,
  keyExtractor,
  renderItem,
  className,
  staggerDelay = 0.1,
  animationType = 'fade',
}: AnimatedListProps<T>) {
  const animations = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    slide: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 },
    },
    scale: {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.8 },
    },
  }

  const selectedAnimation = animations[animationType]

  return (
    <div className={className}>
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <motion.div
            key={keyExtractor(item)}
            layout
            {...selectedAnimation}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
              delay: index * staggerDelay,
            }}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Reorderable list with drag and drop
export function AnimatedReorderList<T>({
  items,
  onReorder,
  keyExtractor,
  renderItem,
  className,
}: {
  items: T[]
  onReorder: (newItems: T[]) => void
  keyExtractor: (item: T) => string | number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
}) {
  const [draggedItem, setDraggedItem] = React.useState<string | number | null>(null)

  return (
    <div className={className}>
      <AnimatePresence>
        {items.map((item, index) => {
          const key = keyExtractor(item)
          return (
            <motion.div
              key={key}
              layout
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={1}
              onDragStart={() => setDraggedItem(key)}
              onDragEnd={() => setDraggedItem(null)}
              animate={{
                scale: draggedItem === key ? 1.05 : 1,
                zIndex: draggedItem === key ? 1 : 0,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25,
              }}
              className={cn(
                'cursor-move',
                draggedItem === key && 'shadow-lg'
              )}
            >
              {renderItem(item, index)}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}