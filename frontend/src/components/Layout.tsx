interface LayoutProps {
  children: React.ReactNode
  title: string
  description?: string
  sidebar?: React.ReactNode
}

export default function Layout({ children, title, description, sidebar }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900">{title}</h1>
          {description && <p className="mt-2 text-lg text-slate-600">{description}</p>}
        </div>

        {sidebar ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
            <div>{children}</div>
            <div className="space-y-6">{sidebar}</div>
          </div>
        ) : (
          <div>{children}</div>
        )}
      </div>
    </div>
  )
}
