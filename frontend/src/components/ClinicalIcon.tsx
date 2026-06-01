interface ClinicalIconProps {
  name: 'shield' | 'activity' | 'building' | 'nurse' | 'clipboard' | 'calendar' | 'pin' | 'badge' | 'clock' | 'file'
  className?: string
}

export default function ClinicalIcon({ name, className = 'h-5 w-5' }: ClinicalIconProps) {
  const paths: Record<ClinicalIconProps['name'], ReactNode> = {
    shield: (
      <>
        <path d="M12 3l7 3v5c0 4.6-3 7.9-7 10-4-2.1-7-5.4-7-10V6l7-3z" />
        <path d="M9 12l2 2 4-5" />
      </>
    ),
    activity: <path d="M4 13h3l2-5 4 9 2-4h5" />,
    building: (
      <>
        <path d="M4 21V7l8-4 8 4v14" />
        <path d="M9 21v-6h6v6" />
        <path d="M8 9h.01M12 9h.01M16 9h.01" />
      </>
    ),
    nurse: (
      <>
        <path d="M12 12a4 4 0 100-8 4 4 0 000 8z" />
        <path d="M4 21a8 8 0 0116 0" />
        <path d="M10 6h4M12 4v4" />
      </>
    ),
    clipboard: (
      <>
        <path d="M9 4h6l1 2h3v15H5V6h3l1-2z" />
        <path d="M9 13l2 2 4-5" />
      </>
    ),
    calendar: (
      <>
        <path d="M7 3v4M17 3v4M4 9h16M5 5h14v16H5z" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s7-4.4 7-11a7 7 0 10-14 0c0 6.6 7 11 7 11z" />
        <path d="M12 10h.01" />
      </>
    ),
    badge: (
      <>
        <path d="M12 3l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 8.2l5-.7L12 3z" />
        <path d="M9.5 12l1.5 1.5 3.5-4" />
      </>
    ),
    clock: (
      <>
        <path d="M12 22a10 10 0 100-20 10 10 0 000 20z" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    file: (
      <>
        <path d="M6 2h8l4 4v16H6z" />
        <path d="M14 2v5h5" />
        <path d="M9 14l2 2 4-5" />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}
import type { ReactNode } from 'react'
