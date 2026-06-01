export default function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 via-cyan-600 to-teal-500 text-white shadow-md">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l7 3v5c0 4.6-3 7.9-7 10-4-2.1-7-5.4-7-10V6l7-3z" />
          <path d="M9 12l2 2 4-5" />
        </svg>
      </div>
      <div>
        <div className="text-sm font-bold text-slate-900">Nivano Care</div>
        <div className="text-xs text-slate-500">Clinical staffing</div>
      </div>
    </div>
  )
}
