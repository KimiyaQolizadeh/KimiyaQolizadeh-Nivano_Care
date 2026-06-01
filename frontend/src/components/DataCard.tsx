import type { ReactNode } from 'react'

interface DataCardProps {
  title: string
  subtitle?: string
  meta?: ReactNode
  footer?: ReactNode
  children?: ReactNode
  className?: string
}

export default function DataCard({ title, subtitle, meta, footer, children, className }: DataCardProps) {
  return (
    <div className={`rounded-2xl border border-blue-100/70 bg-white p-6 shadow-sm shadow-slate-200/70 transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${className || ''}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
          {subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}
        </div>
        {meta && <div className="mt-3 sm:mt-0">{meta}</div>}
      </div>

      {children && <div className="mt-6">{children}</div>}
      {footer && <div className="mt-6 border-t border-slate-200 pt-6">{footer}</div>}
    </div>
  )
}
