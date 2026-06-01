import { useEffect, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import BrandMark from '../components/BrandMark'
import { useAuth } from '../context/AuthContext'
import { getRoleDashboardPath } from '../utils/routes'

type SectionId = 'home' | 'about' | 'how' | 'facilities' | 'nurses' | 'admin'
type Tone = 'blue' | 'teal' | 'emerald' | 'slate'
type IconName = 'activity' | 'building' | 'calendar' | 'check' | 'clipboard' | 'clock' | 'file' | 'heart' | 'map' | 'shield' | 'user'

const navItems: Array<{ id: SectionId; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'how', label: 'How it works' },
  { id: 'facilities', label: 'Organizations' },
  { id: 'nurses', label: 'Nurses' },
  { id: 'admin', label: 'Admin' },
]

const toneClasses: Record<Tone, { bg: string; soft: string; icon: string }> = {
  blue: { bg: 'bg-blue-600', soft: 'bg-blue-50 text-blue-700', icon: 'bg-blue-50 text-blue-700 ring-blue-100' },
  teal: { bg: 'bg-teal-600', soft: 'bg-teal-50 text-teal-700', icon: 'bg-teal-50 text-teal-700 ring-teal-100' },
  emerald: { bg: 'bg-emerald-600', soft: 'bg-emerald-50 text-emerald-700', icon: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  slate: { bg: 'bg-slate-800', soft: 'bg-slate-100 text-slate-700', icon: 'bg-slate-50 text-slate-700 ring-slate-200' },
}

const trustMetrics = [
  { label: 'Credential review', icon: 'shield' as IconName },
  { label: 'Human-approved matches', icon: 'user' as IconName },
  { label: 'Verified attendance', icon: 'check' as IconName },
]

const aboutCards = [
  {
    title: 'Human oversight built in',
    text: 'Administrator review supports reliable account access, credential decisions, and shift confirmations.',
    icon: 'shield' as IconName,
    tone: 'blue' as Tone,
  },
  {
    title: 'Shared staffing context',
    text: 'Facilities, nurses, and administrators work from the same coverage record.',
    icon: 'activity' as IconName,
    tone: 'teal' as Tone,
  },
  {
    title: 'Verified completion',
    text: 'Arrival, shift completion, and attendance verification stay connected.',
    icon: 'clipboard' as IconName,
    tone: 'emerald' as Tone,
  },
]

const steps = [
  {
    title: 'Organization posts a coverage need',
    text: 'Create a request with role, unit, schedule, location, and urgency.',
    icon: 'building' as IconName,
  },
  {
    title: 'Nurse applies',
    text: 'Qualified nurses review shift opportunities and apply with their profile.',
    icon: 'user' as IconName,
  },
  {
    title: 'Human review confirms the match',
    text: 'An administrator reviews credentials, candidate context, and application details.',
    icon: 'shield' as IconName,
  },
  {
    title: 'Attendance is verified',
    text: 'Arrival, shift completion, and attendance verification complete the shift record.',
    icon: 'check' as IconName,
  },
]

const nurseCards = [
  { title: 'Credentials', text: 'Submit documents and keep your profile ready for review.', icon: 'file' as IconName, tone: 'teal' as Tone },
  { title: 'Shift opportunities', text: 'Browse coverage needs that match your clinical profile.', icon: 'calendar' as IconName, tone: 'blue' as Tone },
  { title: 'Shift verification', text: 'Confirm arrival and submit completed shifts for verification.', icon: 'clock' as IconName, tone: 'emerald' as Tone },
]

const adminCards = [
  { title: 'Account review', text: 'Review organization and nurse access before participation.', icon: 'user' as IconName },
  { title: 'Credential verification', text: 'Approve required documents before coverage is confirmed.', icon: 'shield' as IconName },
  { title: 'Application approval', text: 'Confirm the right nurse for each staffing request.', icon: 'clipboard' as IconName },
  { title: 'Attendance visibility', text: 'Track submitted shift records and verified attendance.', icon: 'check' as IconName },
]

function IconGlyph({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  }

  switch (name) {
    case 'activity':
      return <svg {...common}><path d="M3 12h4l2.5-6 5 12 2.5-6h4" /></svg>
    case 'building':
      return <svg {...common}><path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16" /><path d="M8 7h1M12 7h1M8 11h1M12 11h1M8 15h1M12 15h1M3 21h18" /></svg>
    case 'calendar':
      return <svg {...common}><path d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg>
    case 'check':
      return <svg {...common}><path d="M20 6 9 17l-5-5" /></svg>
    case 'clipboard':
      return <svg {...common}><path d="M9 4h6l1 2h2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l1-2Z" /><path d="M9 12h6M9 16h4" /></svg>
    case 'clock':
      return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></svg>
    case 'file':
      return <svg {...common}><path d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M8 13h8M8 17h5" /></svg>
    case 'heart':
      return <svg {...common}><path d="M20.5 8.5c0 5.2-8.5 10.5-8.5 10.5S3.5 13.7 3.5 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8.5 2.5Z" /></svg>
    case 'map':
      return <svg {...common}><path d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
    case 'shield':
      return <svg {...common}><path d="M12 3 19 6v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" /><path d="m9 12 2 2 4-5" /></svg>
    case 'user':
      return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
    default:
      return null
  }
}

function StatusPill({ children, tone = 'emerald' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[tone].soft}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${toneClasses[tone].bg}`} />
      {children}
    </span>
  )
}

function SectionIntro({ eyebrow, title, children, light = false }: { eyebrow: string; title: string; children: ReactNode; light?: boolean }) {
  return (
    <div className="max-w-2xl">
      <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${light ? 'text-cyan-200' : 'text-blue-700'}`}>{eyebrow}</p>
      <h2 className={`mt-3 text-4xl font-semibold tracking-tight sm:text-5xl ${light ? 'text-white' : 'text-slate-950'}`}>{title}</h2>
      <p className={`mt-5 text-base leading-7 sm:text-lg ${light ? 'text-slate-300' : 'text-slate-600'}`}>{children}</p>
    </div>
  )
}

function LandingSection({ id, children, className = '' }: { id: SectionId; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`landing-section scroll-mt-28 ${className}`}>
      <div className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-7xl items-center px-4 py-14 sm:px-6 lg:px-8 lg:py-10">
        <div className="section-reveal w-full">{children}</div>
      </div>
    </section>
  )
}

function CoverageBoard() {
  const statuses = [
    { label: 'Credentials', value: 'Verified', tone: 'teal' as Tone, icon: 'shield' as IconName },
    { label: 'Human review', value: 'Complete', tone: 'blue' as Tone, icon: 'user' as IconName },
    { label: 'Coverage', value: 'Confirmed', tone: 'emerald' as Tone, icon: 'check' as IconName },
    { label: 'Attendance', value: 'Verified', tone: 'emerald' as Tone, icon: 'clock' as IconName },
  ]

  return (
    <div className="relative mx-auto w-full max-w-lg rounded-[2rem] border border-white/70 bg-white/75 p-2.5 shadow-2xl shadow-blue-950/15 backdrop-blur-xl">
      <div className="rounded-[1.55rem] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-base font-semibold">Coverage Board</p>
            <p className="mt-1 text-xs text-blue-100">Live staffing view</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-300/30">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Live
          </span>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.08] p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Registered Nurse (RN)</h2>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-blue-50">
                <span className="inline-flex items-center gap-1.5"><IconGlyph name="building" className="h-4 w-4" />Long-Term Care</span>
                <span className="inline-flex items-center gap-1.5"><IconGlyph name="map" className="h-4 w-4" />Toronto</span>
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm text-blue-50">
                <IconGlyph name="calendar" className="h-4 w-4" />
                Sat, May 30, 9:00 AM - 5:00 PM
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-left sm:text-center">
              <p className="text-2xl font-semibold">8h</p>
              <p className="text-xs text-blue-100">coverage</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {statuses.map((status) => (
            <div key={status.label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-blue-50">
                    <IconGlyph name={status.icon} className="h-4 w-4" />
                  </span>
                  <p className="truncate text-sm font-medium text-blue-50">{status.label}</p>
                </div>
                <StatusPill tone={status.tone}>{status.value}</StatusPill>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-white/95 p-4 text-slate-900">
          <div className="grid grid-cols-4 gap-2">
            {['Request', 'Review', 'Confirmed', 'Verified'].map((item, index) => (
              <div key={item} className="relative text-center">
                {index < 3 ? <span className="absolute left-1/2 top-3 h-px w-full bg-slate-200" /> : null}
                <span className="relative mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white ring-4 ring-white">
                  <IconGlyph name="check" className="h-3.5 w-3.5" />
                </span>
                <p className="mt-2 text-[11px] font-semibold text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Home() {
  const { user } = useAuth()
  const dashboardPath = getRoleDashboardPath(user?.role)
  const [activeSection, setActiveSection] = useState<SectionId>('home')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target.id) setActiveSection(visible.target.id as SectionId)
      },
      { rootMargin: '-30% 0px -45% 0px', threshold: [0.2, 0.4, 0.6] },
    )

    navItems.forEach((item) => {
      const section = document.getElementById(item.id)
      if (section) observer.observe(section)
    })

    return () => observer.disconnect()
  }, [])

  const scrollToSection = (event: MouseEvent<HTMLButtonElement>, targetId: SectionId) => {
    event.preventDefault()
    const target = document.getElementById(targetId)
    if (!target) return

    const headerOffset = 76
    const top = target.getBoundingClientRect().top + window.scrollY - headerOffset
    setActiveSection(targetId)
    window.history.pushState(null, '', `#${targetId}`)
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <style>{`
        html { scroll-behavior: smooth; scroll-padding-top: 92px; }
        @media (prefers-reduced-motion: no-preference) {
          .section-reveal {
            animation: fadeUp 760ms ease-out both;
          }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <button type="button" onClick={(event) => scrollToSection(event, 'home')} className="flex items-center gap-3">
            <BrandMark />
          </button>

          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/70 p-1 text-sm font-semibold text-slate-600 shadow-sm shadow-slate-950/5 md:flex">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={(event) => scrollToSection(event, item.id)}
                className={`rounded-full px-3.5 py-2 transition duration-300 ${
                  activeSection === item.id ? 'bg-blue-600 text-white shadow-sm shadow-blue-950/15' : 'hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <Link to={dashboardPath}>
                <Button size="sm">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden text-sm font-semibold text-slate-600 transition hover:text-blue-700 sm:inline">
                  Sign in
                </Link>
                <Link to="/register">
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main>
        <LandingSection id="home" className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.18),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eff6ff_52%,_#ffffff_100%)]">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[0.98fr_1.02fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-800 shadow-sm shadow-blue-900/5">
                <IconGlyph name="shield" className="h-4 w-4" />
                Healthcare Staffing Platform
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Reliable healthcare staffing, coordinated in one platform.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Nivano Care brings staffing requests, qualified nurses, credential review, shift approvals, and attendance
                verification into one connected workspace.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to={user ? dashboardPath : '/login'}><Button className="w-full sm:w-auto">Sign in</Button></Link>
                <Link to="/register"><Button variant="secondary" className="w-full bg-white/80 sm:w-auto">Create account</Button></Link>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {trustMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-white/70 bg-white/75 p-3.5 shadow-sm shadow-blue-950/5 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-950/10">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                      <IconGlyph name={metric.icon} className="h-4 w-4" />
                    </span>
                    <p className="mt-2.5 text-sm font-semibold text-slate-800">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-blue-200 via-cyan-100 to-emerald-200 opacity-70 blur-3xl" />
              <div className="relative transition-all duration-500 hover:scale-[1.01]">
                <CoverageBoard />
              </div>
            </div>
          </div>
        </LandingSection>

        <LandingSection id="about" className="bg-gradient-to-br from-white via-slate-50 to-cyan-50">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <SectionIntro eyebrow="About Nivano Care" title="Healthcare staffing needs speed, visibility, and oversight.">
      Nivano Care connects healthcare organizations, nurses, and administrators from coverage request to verified attendance.
            </SectionIntro>
            <div className="grid gap-4">
              {aboutCards.map((card) => (
                <div key={card.title} className="rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm shadow-slate-950/5 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/10">
                  <div className="flex gap-4">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${toneClasses[card.tone].icon}`}>
                      <IconGlyph name={card.icon} />
                    </span>
                    <div>
                      <h3 className="font-semibold text-slate-950">{card.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{card.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </LandingSection>

        <LandingSection id="how" className="relative overflow-hidden bg-slate-950 text-white">
          <div className="w-full">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">How it works</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">From staffing request to verified attendance.</h2>
              <p className="mt-5 text-base leading-7 text-slate-300 sm:text-lg">
                A focused path for coverage requests, nurse applications, human review, and shift closeout.
              </p>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-4">
              {steps.map((step, index) => (
                <div key={step.title} className="relative rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/[0.09]">
                  {index < steps.length - 1 ? <span className="absolute left-[calc(50%+2rem)] top-10 hidden h-px w-[calc(100%-4rem)] bg-gradient-to-r from-cyan-300/45 to-transparent lg:block" /> : null}
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-100 ring-1 ring-cyan-200/20">
                    <IconGlyph name={step.icon} />
                  </span>
                  <p className="mt-5 text-sm font-semibold text-cyan-200">Step {index + 1}</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </LandingSection>

        <LandingSection id="facilities" className="bg-gradient-to-br from-blue-50 via-white to-cyan-50">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <SectionIntro eyebrow="For healthcare organizations" title="Coverage tools for healthcare teams.">
              Post coverage needs, track status, verify attendance, and keep updates in one place.
            </SectionIntro>
            <div className="rounded-[2rem] border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-950/10">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Organization workspace</p>
                  <p className="mt-1 text-sm text-slate-500">Coverage at a glance</p>
                </div>
                <StatusPill tone="blue">Confirmed coverage</StatusPill>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {[['Open requests', '12'], ['Applications', '28'], ['Confirmed shifts', '9'], ['Ready to verify', '4']].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-2xl font-semibold text-slate-950">{value}</p>
                    <p className="mt-1 text-sm text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950">Staffing request</p>
                    <p className="mt-1 text-sm text-slate-500">RN | Long-Term Care | Toronto</p>
                  </div>
                  <StatusPill tone="emerald">Filled</StatusPill>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-blue-600 to-emerald-500" />
                </div>
              </div>
            </div>
          </div>
        </LandingSection>

        <LandingSection id="nurses" className="bg-gradient-to-br from-white via-emerald-50 to-slate-50">
          <div className="w-full">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <SectionIntro eyebrow="For nurses" title="Shift access for qualified nurses.">
                Manage your profile, keep credentials ready, browse shift opportunities, apply, and complete shift verification.
              </SectionIntro>
              <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-xl shadow-emerald-950/5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950">Available shift</p>
                    <p className="mt-1 text-sm text-slate-500">Registered Nurse | Rehabilitation</p>
                  </div>
                  <StatusPill tone="teal">Credentials ready</StatusPill>
                </div>
                <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-slate-100"><IconGlyph name="map" className="h-4 w-4 text-teal-700" />Toronto</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-slate-100"><IconGlyph name="clock" className="h-4 w-4 text-blue-700" />7:00 AM - 3:00 PM</span>
                </div>
              </div>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {nurseCards.map((card) => (
                <div key={card.title} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm shadow-slate-950/5 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/10">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${toneClasses[card.tone].icon}`}>
                    <IconGlyph name={card.icon} />
                  </span>
                  <h3 className="mt-5 font-semibold text-slate-950">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </LandingSection>

        <LandingSection id="admin" className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <SectionIntro eyebrow="Human oversight" title="Administrator review for safer staffing decisions." light>
              Account review, credential verification, application approval, and attendance visibility make the process more reliable.
            </SectionIntro>
            <div className="grid gap-4 sm:grid-cols-2">
              {adminCards.map((card) => (
                <div key={card.title} className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/[0.1]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-cyan-100 ring-1 ring-white/10">
                    <IconGlyph name={card.icon} />
                  </span>
                  <h3 className="mt-5 font-semibold text-white">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </LandingSection>
      </main>
    </div>
  )
}

export default Home
