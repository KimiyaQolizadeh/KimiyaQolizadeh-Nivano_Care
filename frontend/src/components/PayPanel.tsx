import type { PricingBreakdown } from '../types'

interface PayPanelProps {
  hourly?: number | null
  total?: number | null
  breakdown?: PricingBreakdown | null
  helper?: string
  compact?: boolean
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) return 'Not available'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

export default function PayPanel({ hourly, total, breakdown, helper, compact = false }: PayPanelProps) {
  return (
    <div className="w-full min-w-0 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
      <div className={compact ? 'space-y-3' : 'grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center'}>
        <div>
          <p className="text-sm font-semibold text-emerald-800">Estimated nurse pay</p>
          {helper && <p className="mt-1 text-xs leading-5 text-emerald-700">{helper}</p>}
        </div>
        <div className="grid w-full min-w-0 grid-cols-2 gap-3">
          <div className="flex min-h-[76px] flex-col items-center justify-center rounded-xl bg-white/85 p-3 text-center ring-1 ring-white">
            <p className="whitespace-nowrap text-xs font-semibold leading-none text-slate-500">Hourly</p>
            <p className="mt-2 whitespace-nowrap text-xl font-semibold leading-none text-slate-950">{formatCurrency(hourly)}</p>
          </div>
          <div className="flex min-h-[76px] flex-col items-center justify-center rounded-xl bg-white/85 p-3 text-center ring-1 ring-white">
            <p className="whitespace-nowrap text-xs font-semibold leading-none text-slate-500">Shift total</p>
            <p className="mt-2 whitespace-nowrap text-xl font-semibold leading-none text-slate-950">{formatCurrency(total)}</p>
          </div>
        </div>
      </div>
      {breakdown && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex min-h-[24px] items-center justify-center whitespace-nowrap rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold leading-none text-slate-600">Base {formatCurrency(breakdown.base_rate)}</span>
          <span className="inline-flex min-h-[24px] items-center justify-center whitespace-nowrap rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold leading-none text-slate-600">Urgency +{formatCurrency(breakdown.urgency_bonus)}</span>
          <span className="inline-flex min-h-[24px] items-center justify-center whitespace-nowrap rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold leading-none text-slate-600">Experience +{formatCurrency(breakdown.experience_premium)}</span>
          <span className="inline-flex min-h-[24px] items-center justify-center whitespace-nowrap rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold leading-none text-slate-600">{breakdown.shift_hours}h</span>
        </div>
      )}
    </div>
  )
}
