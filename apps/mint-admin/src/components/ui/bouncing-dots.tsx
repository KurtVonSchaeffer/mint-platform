"use client"

import React from "react"
import { cva } from "class-variance-authority"
import { HTMLMotionProps, motion } from "motion/react"

import { cn } from "@/lib/utils"

const bouncingDotsVariant = cva("flex gap-2 items-center justify-center", {
  variants: {
    messagePlacement: {
      bottom: "flex-col",
      right:  "flex-row",
      left:   "flex-row-reverse",
    },
  },
  defaultVariants: {
    messagePlacement: "bottom",
  },
})

export interface BouncingDotsProps {
  /**
   * The number of bouncing dots to display.
   * @default 3
   */
  dots?: number
  /**
   * Optional message to display alongside the bouncing dots.
   */
  message?: string
  /**
   * Position of the message relative to the dots.
   * @default "bottom"
   */
  messagePlacement?: "bottom" | "left" | "right"
}

export function BouncingDots({
  dots = 3,
  message,
  messagePlacement = "bottom",
  className,
  ...props
}: HTMLMotionProps<"div"> & BouncingDotsProps) {
  return (
    <div className={cn(bouncingDotsVariant({ messagePlacement }))}>
      <div className="flex gap-2 items-center justify-center">
        {Array(dots)
          .fill(undefined)
          .map((_, index) => (
            <motion.div
              key={index}
              /* AlgoLend purple — adapts to --color-violet CSS variable */
              className={cn(
                "w-2.5 h-2.5 rounded-full",
                "bg-[var(--color-purple,#7C3AED)]",
                className,
              )}
              animate={{ y: [0, -14, 0] }}
              transition={{
                duration:  0.6,
                repeat:    Number.POSITIVE_INFINITY,
                delay:     index * 0.18,
                ease:      "easeInOut",
              }}
              {...props}
            />
          ))}
      </div>
      {message && (
        <p className="text-sm text-[var(--color-text3,#4B5080)]">{message}</p>
      )}
    </div>
  )
}
