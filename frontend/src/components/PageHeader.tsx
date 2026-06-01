interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
      <div className="flex-1">
        <h1 className="text-3xl font-extrabold leading-tight text-slate-950 md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 text-sm md:text-lg text-slate-600 max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
