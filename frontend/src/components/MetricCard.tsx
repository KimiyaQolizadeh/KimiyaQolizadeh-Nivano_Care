import React from 'react'

interface MetricCardProps {
  title: string
  value: React.ReactNode
  icon?: React.ReactNode
  hint?: string
  className?: string
}

export default function MetricCard({ title, value, icon, hint, className }: MetricCardProps) {
  return (
    <div className={`flex h-full min-h-[150px] rounded-2xl border border-slate-100 bg-white p-6 shadow-sm shadow-slate-200/60 transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${className || ''}`}>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="flex items-center gap-3">
          {icon && <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">{icon}</div>}
          <p className="min-w-0 text-sm font-semibold leading-5 text-slate-600">{title}</p>
        </div>
        <div>
          <div className="mt-5 text-3xl font-semibold leading-9 text-slate-950">{value}</div>
          {hint && <div className="mt-2 text-sm leading-5 text-slate-500">{hint}</div>}
        </div>
      </div>
    </div>
  )
}
