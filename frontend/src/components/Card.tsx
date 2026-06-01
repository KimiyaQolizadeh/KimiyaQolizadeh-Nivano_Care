interface CardProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  className?: string
}

export default function Card({ children, title, subtitle, className }: CardProps) {
  return (
    <div className={`rounded-2xl border border-blue-100/70 bg-white/95 p-6 shadow-sm shadow-slate-200/70 backdrop-blur-sm ${className || ''}`}>
      {title && (
        <div className="mb-4">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
          {subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
