import Button from './Button'

interface NextStepCardProps {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}

export default function NextStepCard({ title, description, actionLabel, onAction }: NextStepCardProps) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-emerald-50 p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Next step</p>
      <h3 className="mt-3 text-xl font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-5">
        <Button type="button" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </div>
  )
}
