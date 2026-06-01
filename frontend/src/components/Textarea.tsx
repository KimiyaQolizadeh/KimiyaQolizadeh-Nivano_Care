import type { TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helperText?: string
  error?: string
}

export default function Textarea({ label, helperText, error, ...props }: TextareaProps) {
  return (
    <label className="block space-y-2">
      {label && <span className="block text-sm font-semibold text-slate-900">{label}</span>}
      <textarea
        className={`
          w-full rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-sm
          outline-none transition duration-200 resize-none transform
          ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
              : 'border border-slate-100 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
          }
        `}
        {...props}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="text-sm text-slate-500">{helperText}</p>}
    </label>
  )
}
