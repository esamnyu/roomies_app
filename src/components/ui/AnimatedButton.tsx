'use client'

import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button, ButtonProps } from '@/components/primitives/Button'

interface AnimatedButtonProps extends ButtonProps {
  motionProps?: HTMLMotionProps<'button'>
  hoverScale?: number
  tapScale?: number
}

export const AnimatedButton = React.forwardRef<
  HTMLButtonElement,
  AnimatedButtonProps
>(({ children, className, motionProps, hoverScale = 1.05, tapScale = 0.95, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      className={cn('relative overflow-hidden', className)}
      asChild
      {...props}
    >
      <motion.button
        whileHover={{ scale: hoverScale }}
        whileTap={{ scale: tapScale }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 17,
        }}
        {...motionProps}
      >
        {children}
      </motion.button>
    </Button>
  )
})
AnimatedButton.displayName = 'AnimatedButton'

// Success button with checkmark animation
export function SuccessButton({
  children,
  onSuccess,
  successMessage = 'Done!',
  ...props
}: AnimatedButtonProps & {
  onSuccess?: () => void
  successMessage?: string
}) {
  const [isSuccess, setIsSuccess] = React.useState(false)

  const handleClick = async () => {
    if (props.onClick) {
      await props.onClick(null as any)
    }
    setIsSuccess(true)
    onSuccess?.()
    
    setTimeout(() => {
      setIsSuccess(false)
    }, 2000)
  }

  return (
    <AnimatedButton
      {...props}
      onClick={handleClick}
      disabled={isSuccess || props.disabled}
    >
      <motion.span
        animate={{
          opacity: isSuccess ? 0 : 1,
          y: isSuccess ? -20 : 0,
        }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.span>
      <motion.span
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: isSuccess ? 1 : 0,
          y: isSuccess ? 0 : 20,
        }}
        transition={{ duration: 0.2 }}
      >
        <svg
          className="mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <motion.path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: isSuccess ? 1 : 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          />
        </svg>
        {successMessage}
      </motion.span>
    </AnimatedButton>
  )
}