interface EmptyStateProps {
  title: string
  message: string
  action?: React.ReactNode
  icon?: React.ReactNode
}

export default function EmptyState({ title, message, action, icon }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-blue-100/70 bg-white/90 p-10 text-center shadow-sm shadow-slate-200/70">
      <div className="flex justify-center mb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-emerald-50 text-blue-700 shadow-sm">
          {icon || <span className="font-bold">NC</span>}
        </div>
      </div>
      <h3 className="text-lg md:text-xl font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm md:text-base text-slate-600">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
