interface InlineStatusProps {
  status: string
  label?: string
}

const statusStyles: Record<string, { dot: string; text: string; label: string }> = {
  applied: { dot: 'bg-amber-500', text: 'text-amber-700', label: 'Pending review' },
  pending: { dot: 'bg-amber-500', text: 'text-amber-700', label: 'Pending review' },
  pending_review: { dot: 'bg-amber-500', text: 'text-amber-700', label: 'Pending review' },
  approved: { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Approved' },
  verified: { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Verified' },
  available: { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Available' },
  confirmed: { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Confirmed' },
  completed: { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Completed' },
  urgent: { dot: 'bg-rose-500', text: 'text-rose-700', label: 'Urgent' },
  normal: { dot: 'bg-blue-500', text: 'text-blue-700', label: 'Standard' },
  open: { dot: 'bg-blue-500', text: 'text-blue-700', label: 'Open' },
  under_review: { dot: 'bg-blue-500', text: 'text-blue-700', label: 'Under review' },
  awaiting: { dot: 'bg-blue-500', text: 'text-blue-700', label: 'Awaiting' },
  arrival_confirmed: { dot: 'bg-blue-500', text: 'text-blue-700', label: 'Arrival confirmed' },
  unavailable: { dot: 'bg-slate-400', text: 'text-slate-600', label: 'Unavailable' },
  on_shift: { dot: 'bg-blue-500', text: 'text-blue-700', label: 'On shift' },
  not_started: { dot: 'bg-slate-400', text: 'text-slate-600', label: 'Not started' },
  submitted: { dot: 'bg-amber-500', text: 'text-amber-700', label: 'Submitted' },
  rejected: { dot: 'bg-rose-500', text: 'text-rose-700', label: 'Rejected' },
  cancelled: { dot: 'bg-rose-500', text: 'text-rose-700', label: 'Cancelled' },
  disputed: { dot: 'bg-rose-500', text: 'text-rose-700', label: 'Disputed' },
  withdrawn: { dot: 'bg-slate-400', text: 'text-slate-600', label: 'Withdrawn' },
}

export default function InlineStatus({ status, label }: InlineStatusProps) {
  const config = statusStyles[status] || { dot: 'bg-slate-400', text: 'text-slate-600', label: status.replace(/_/g, ' ') }

  return (
    <span className={`inline-flex max-w-full min-w-0 items-center gap-2 text-sm font-semibold leading-tight ${config.text}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
      <span className="min-w-0 break-words leading-tight">{label || config.label}</span>
    </span>
  )
}
