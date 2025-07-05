'use client'

import React from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedCounterProps {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}

export function AnimatedCounter({
  value,
  duration = 1,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: AnimatedCounterProps) {
  const spring = useSpring(0, { duration: duration * 1000 })
  const display = useTransform(spring, (current) =>
    `${prefix}${current.toFixed(decimals)}${suffix}`
  )

  React.useEffect(() => {
    spring.set(value)
  }, [spring, value])

  return <motion.span className={className}>{display}</motion.span>
}

// Currency counter with formatting
export function AnimatedCurrencyCounter({
  value,
  currency = 'USD',
  locale = 'en-US',
  ...props
}: AnimatedCounterProps & {
  currency?: string
  locale?: string
}) {
  const spring = useSpring(0, { duration: 1000 })
  const display = useTransform(spring, (current) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(current)
  )

  React.useEffect(() => {
    spring.set(value)
  }, [spring, value])

  return <motion.span className={props.className}>{display}</motion.span>
}

// Progress counter with visual indicator
export function AnimatedProgress({
  value,
  max = 100,
  showPercentage = true,
  className,
  barClassName,
}: {
  value: number
  max?: number
  showPercentage?: boolean
  className?: string
  barClassName?: string
}) {
  const percentage = (value / max) * 100
  const spring = useSpring(0, { duration: 1000 })
  const width = useTransform(spring, (current) => `${current}%`)
  const display = useTransform(spring, (current) => `${Math.round(current)}%`)

  React.useEffect(() => {
    spring.set(percentage)
  }, [spring, percentage])

  return (
    <div className={cn('space-y-2', className)}>
      {showPercentage && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <motion.span className="font-medium">{display}</motion.span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          className={cn('h-full bg-primary', barClassName)}
          style={{ width }}
        />
      </div>
    </div>
  )
}