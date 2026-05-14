import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "../lib/utils"

const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function KPICard({ 
  title, 
  value, 
  previousValue, 
  icon: Icon, 
  trend, 
  format = "number",
  className,
  delay = 0
}) {
  const [displayValue, setDisplayValue] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  // Calculate trend if not provided
  const calculatedTrend = trend || (previousValue ? 
    ((value - previousValue) / previousValue * 100) : 0)

  const getTrendIcon = () => {
    if (calculatedTrend > 0) return TrendingUp
    if (calculatedTrend < 0) return TrendingDown
    return Minus
  }

  const getTrendColor = () => {
    if (calculatedTrend > 0) return "text-green-500"
    if (calculatedTrend < 0) return "text-red-500"
    return "text-muted-foreground"
  }

  const formatValue = (val) => {
    switch (format) {
      case "currency":
        return formatCurrency(val)
      case "percentage":
        return `${val.toFixed(1)}%`
      default:
        return formatNumber(val)
    }
  }

  // Animated counter effect
  useEffect(() => {
    if (!isVisible) return

    const duration = 1500 // 1.5 seconds
    const steps = 60
    const stepValue = value / steps
    let currentStep = 0

    const timer = setInterval(() => {
      currentStep++
      const currentValue = Math.min(stepValue * currentStep, value)
      setDisplayValue(currentValue)

      if (currentStep >= steps) {
        clearInterval(timer)
        setDisplayValue(value)
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [value, isVisible])

  const TrendIcon = getTrendIcon()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        delay: delay,
        ease: "easeOut"
      }}
      onViewportEnter={() => setIsVisible(true)}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-200",
        "hover:shadow-md hover:border-primary/20",
        "group cursor-pointer",
        className
      )}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-200">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">
            {title}
          </h3>
        </div>
        
        {/* Trend indicator */}
        {calculatedTrend !== 0 && (
          <motion.div 
            className={cn("flex items-center space-x-1", getTrendColor())}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.3 }}
          >
            <TrendIcon className="h-3 w-3" />
            <span className="text-xs font-medium">
              {Math.abs(calculatedTrend).toFixed(1)}%
            </span>
          </motion.div>
        )}
      </div>

      {/* Value */}
      <div className="space-y-2">
        <motion.div
          className="text-2xl font-bold text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.2 }}
        >
          {formatValue(displayValue)}
        </motion.div>

        {/* Previous period comparison */}
        {previousValue && (
          <motion.p 
            className="text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.4 }}
          >
            vs {formatValue(previousValue)} période précédente
          </motion.p>
        )}
      </div>

      {/* Loading shimmer effect during counter animation */}
      {isVisible && displayValue < value && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{
            x: [-200, 200],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      )}

      {/* Hover effect border */}
      <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-transparent group-hover:ring-primary/20 transition-all duration-200" />
    </motion.div>
  )
}

// Skeleton loader for KPI cards
export function KPICardSkeleton({ className }) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-6 shadow-sm",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-muted animate-pulse h-9 w-9" />
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-4 w-12 bg-muted animate-pulse rounded" />
      </div>
      
      <div className="space-y-2">
        <div className="h-8 w-20 bg-muted animate-pulse rounded" />
        <div className="h-3 w-32 bg-muted animate-pulse rounded" />
      </div>
    </div>
  )
}