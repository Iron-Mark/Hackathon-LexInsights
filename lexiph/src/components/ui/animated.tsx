'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { ReactNode } from 'react'

// Fade In Animation
export function FadeIn({ children, delay = 0, ...props }: HTMLMotionProps<'div'> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Slide In from Left
export function SlideInLeft({ children, delay = 0, ...props }: HTMLMotionProps<'div'> & { delay?: number }) {
  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -100, opacity: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Slide In from Right
export function SlideInRight({ children, delay = 0, ...props }: HTMLMotionProps<'div'> & { delay?: number }) {
  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Slide Up
export function SlideUp({ children, delay = 0, ...props }: HTMLMotionProps<'div'> & { delay?: number }) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Scale In
export function ScaleIn({ children, delay = 0, ...props }: HTMLMotionProps<'div'> & { delay?: number }) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.2, delay, ease: 'easeOut' }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Stagger Children
interface StaggerProps {
  children: ReactNode
  staggerDelay?: number
  className?: string
}

export function StaggerChildren({ children, staggerDelay = 0.1, className }: StaggerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Stagger Item (use with StaggerChildren)
export function StaggerItem({ children, ...props }: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Hover Scale
export function HoverScale({ children, scale = 1.05, ...props }: HTMLMotionProps<'div'> & { scale?: number }) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

// Animated Button
export function AnimatedButton({ children, ...props }: HTMLMotionProps<'button'>) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      {...props}
    >
      {children}
    </motion.button>
  )
}
