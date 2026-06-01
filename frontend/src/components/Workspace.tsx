import type { ReactNode } from 'react'

interface WorkspaceTab<T extends string> {
  id: T
  label: string
}

interface WorkspaceShellProps<T extends string> {
  title: string
  subtitle: string
  roleLabel: string
  status?: ReactNode
  primaryAction?: ReactNode
  tabs: Array<WorkspaceTab<T>>
  activeTab: T
  onTabChange: (tab: T) => void
  aside?: ReactNode
  children: ReactNode
}

export function WorkspaceShell<T extends string>({
  title,
  subtitle,
  roleLabel,
  status,
  primaryAction,
  tabs,
  activeTab,
  onTabChange,
  aside,
  children,
}: WorkspaceShellProps<T>) {
  return (
    <div className="relative -mx-4 -my-4 min-h-[calc(100vh-96px)] overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/60 to-emerald-50/50 px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(20,184,166,0.16),_transparent_32%)]" />
      <div className="relative mx-auto max-w-7xl space-y-6">
        <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-sm shadow-slate-200/80 backdrop-blur">
          <div className="h-1.5 bg-gradient-to-r from-blue-700 via-cyan-500 to-emerald-400" />
          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                  {roleLabel}
                </span>
                {status}
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{subtitle}</p>
            </div>
            {primaryAction && <div className="flex lg:justify-end">{primaryAction}</div>}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[240px_minmax(0,1fr)_320px]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <WorkspaceTabs tabs={tabs} activeTab={activeTab} onChange={onTabChange} />
          </aside>

          <main className="min-w-0 space-y-6">{children}</main>

          {aside && <aside className="min-w-0 lg:col-span-2 2xl:col-span-1 2xl:sticky 2xl:top-24 2xl:self-start">{aside}</aside>}
        </div>
      </div>
    </div>
  )
}

interface WorkspaceTabsProps<T extends string> {
  tabs: Array<WorkspaceTab<T>>
  activeTab: T
  onChange: (tab: T) => void
}

export function WorkspaceTabs<T extends string>({ tabs, activeTab, onChange }: WorkspaceTabsProps<T>) {
  return (
    <nav className="overflow-x-auto rounded-3xl border border-white/80 bg-white/85 p-2 shadow-sm shadow-slate-200/70 backdrop-blur lg:overflow-visible">
      <div className="flex min-w-max gap-2 lg:min-w-0 lg:flex-col">
        {tabs.map(tab => {
          const isActive = tab.id === activeTab

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`rounded-2xl px-4 py-3 text-left text-sm font-bold transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                isActive
                  ? 'bg-slate-950 text-white shadow-md shadow-slate-300/70'
                  : 'text-slate-600 hover:bg-blue-50 hover:text-blue-800'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

interface TodayPanelProps {
  title?: string
  eyebrow?: string
  children: ReactNode
}

export function TodayPanel({ title = 'Needs attention', eyebrow = 'Today', children }: TodayPanelProps) {
  return (
    <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-sm shadow-slate-200/70 backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-extrabold text-slate-950">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  )
}

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">{title}</h2>
        {subtitle && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

interface SummaryMetricProps {
  label: string
  value: ReactNode
  helper?: string
  icon?: ReactNode
  tone?: 'blue' | 'emerald' | 'teal' | 'amber' | 'slate'
}

export function SummaryMetric({ label, value, helper, icon, tone = 'blue' }: SummaryMetricProps) {
  const tones = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    teal: 'border-teal-100 bg-teal-50 text-teal-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }

  return (
    <div className="flex h-full min-h-[150px] rounded-2xl border border-slate-100 bg-white p-6 shadow-sm shadow-slate-200/60 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="flex items-center gap-3">
          {icon && <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}>{icon}</div>}
          <p className="min-w-0 text-sm font-semibold leading-5 text-slate-600">{label}</p>
        </div>
        <div>
          <div className="mt-5 text-3xl font-semibold leading-9 text-slate-950">{value}</div>
          {helper && <p className="mt-2 text-sm leading-5 text-slate-500">{helper}</p>}
        </div>
      </div>
    </div>
  )
}

interface RecordCardProps {
  children: ReactNode
  className?: string
}

export function RecordCard({ children, className }: RecordCardProps) {
  return (
    <div className={`w-full min-w-0 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm shadow-slate-200/70 transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${className || ''}`}>
      {children}
    </div>
  )
}
