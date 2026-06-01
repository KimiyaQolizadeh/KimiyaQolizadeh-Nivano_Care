import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

const variantClasses = {
  primary: 'bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-md hover:shadow-lg disabled:opacity-60',
  secondary: 'bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 shadow-sm disabled:opacity-60',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 shadow-sm',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 disabled:text-slate-400',
}

const sizeClasses = {
  sm: 'min-h-[36px] px-3 py-2 text-sm',
  md: 'min-h-[42px] px-4 py-2.5 text-base',
  lg: 'min-h-[48px] px-6 py-3 text-lg',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        font-semibold rounded-2xl transform transition duration-200 ease-out inline-flex items-center justify-center gap-2
        whitespace-nowrap leading-none
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'cursor-not-allowed' : 'hover:-translate-y-0.5'}
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-200
        ${className || ''}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}
