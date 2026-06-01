import React from 'react'

interface PremiumCardProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  accent?: string
  className?: string
}

export default function PremiumCard({ children, title, subtitle, accent, className }: PremiumCardProps) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-blue-100/70 bg-white/95 p-6 shadow-sm shadow-slate-200/70 backdrop-blur-sm ${className || ''}`}>
      {accent && <div className={`h-1 ${accent} w-full`} />}
      {title && (
        <div className="mb-4 mt-4">
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
