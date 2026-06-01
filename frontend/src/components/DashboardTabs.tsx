interface DashboardTabsProps<T extends string> {
  tabs: Array<{ id: T; label: string }>
  activeTab: T
  onChange: (tab: T) => void
}

export default function DashboardTabs<T extends string>({ tabs, activeTab, onChange }: DashboardTabsProps<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-blue-100/70 bg-white/80 p-2 shadow-sm shadow-slate-200/70">
      <div className="flex min-w-max gap-2">
        {tabs.map(tab => {
          const isActive = tab.id === activeTab

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                isActive
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-blue-50 hover:text-blue-800'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
