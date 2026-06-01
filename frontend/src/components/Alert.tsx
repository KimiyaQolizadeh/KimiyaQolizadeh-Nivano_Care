interface AlertProps {
  type: 'success' | 'error' | 'info' | 'warning'
  title?: string
  message: string
  onClose?: () => void
}

const typeStyles = {
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: '✓' },
  error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '✕' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'ℹ' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: '⚠' },
}

export default function Alert({ type, title, message, onClose }: AlertProps) {
  const style = typeStyles[type]

  return (
    <div className={`rounded-2xl ${style.bg} border ${style.border} p-4 ${style.text} flex items-start gap-3`}>
      <span className="text-lg font-semibold">{style.icon}</span>
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <p className={title ? 'mt-1 text-sm' : ''}>{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-lg hover:opacity-70 transition"
          aria-label="Close"
        >
          ✕
        </button>
      )}
    </div>
  )
}
