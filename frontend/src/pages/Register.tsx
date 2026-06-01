import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import apiClient, { userUrl } from '../api/axios'
import Alert from '../components/Alert'
import BrandMark from '../components/BrandMark'
import Button from '../components/Button'
import Input from '../components/Input'
import PremiumCard from '../components/PremiumCard'
import { useAuth } from '../context/AuthContext'
import type { AvailabilityStatus, FacilityProfileCreate, NurseProfileCreate, UserRole } from '../types'
import { getRoleDashboardPath } from '../utils/routes'

type PublicRole = Extract<UserRole, 'nurse' | 'facility'>

const availableRoles: Array<{ label: string; value: PublicRole; description: string; icon: string }> = [
  { label: 'Nurse', value: 'nurse', description: 'Apply for shifts, manage credentials, and complete shift verification.', icon: 'nurse' },
  { label: 'Healthcare Organization', value: 'facility', description: 'Create staffing requests, monitor coverage, and verify completed attendance.', icon: 'building' },
]

const ontarioCities = [
  'Toronto',
  'Mississauga',
  'Brampton',
  'Vaughan',
  'Markham',
  'Richmond Hill',
  'North York',
  'Scarborough',
  'Etobicoke',
  'Hamilton',
  'Ottawa',
  'London',
  'Kitchener',
  'Waterloo',
  'Windsor',
  'Barrie',
  'Oshawa',
]

const facilityTypes = [
  'Long-Term Care',
  'Hospital',
  'Retirement Home',
  'Clinic',
  'Rehabilitation Centre',
  'Home Care Agency',
  'Other',
]

const professionOptions = [
  { label: 'Registered Nurse (RN)', value: 'Registered Nurse (RN)' },
  { label: 'Registered Practical Nurse (RPN)', value: 'Registered Practical Nurse (RPN)' },
  { label: 'Personal Support Worker (PSW)', value: 'Personal Support Worker (PSW)' },
]

const availabilityOptions: Array<{ label: string; value: AvailabilityStatus }> = [
  { label: 'Available', value: 'available' },
  { label: 'Unavailable', value: 'unavailable' },
  { label: 'On shift', value: 'on_shift' },
]

function RoleIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    building: <><path d="M4 21V7l8-4 8 4v14" /><path d="M9 21v-6h6v6" /><path d="M8 9h.01M12 9h.01M16 9h.01" /></>,
    nurse: <><path d="M12 12a4 4 0 100-8 4 4 0 000 8z" /><path d="M4 21a8 8 0 0116 0" /><path d="M10 6h4M12 4v4" /></>,
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }> | string[]
}) {
  return (
    <label className="block space-y-2 text-sm text-slate-700">
      <span>{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        required
      >
        {options.map(option => {
          const value = typeof option === 'string' ? option : option.value
          const label = typeof option === 'string' ? option : option.label
          return <option key={value} value={value}>{label}</option>
        })}
      </select>
    </label>
  )
}

function FormSection({ step, title, subtitle, children }: { step: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-extrabold text-blue-700">{step}</span>
        <div>
          <h2 className="font-extrabold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (normalized.length !== 10) return null
  return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`
}

function normalizePostalCode(value: string) {
  const normalized = value.replace(/\s+/g, '').toUpperCase()
  if (!/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/.test(normalized)) return null
  return `${normalized.slice(0, 3)} ${normalized.slice(3)}`
}

export default function Register() {
  const navigate = useNavigate()
  const { register, user, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accountPhone, setAccountPhone] = useState('')
  const [role, setRole] = useState<PublicRole>('nurse')
  const [nurseDetails, setNurseDetails] = useState({
    first_name: '',
    last_name: '',
    profession: 'Registered Nurse (RN)',
    license_number: '',
    years_experience: 1,
    city: 'Toronto',
    availability_status: 'available' as AvailabilityStatus,
  })
  const [facilityDetails, setFacilityDetails] = useState({
    organization_name: '',
    facility_type: 'Long-Term Care',
    contact_first_name: '',
    contact_last_name: '',
    street_address: '',
    city: 'Toronto',
    province: 'Ontario',
    postal_code: '',
  })
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const passwordChecks = [
    { label: 'At least 8 characters', passed: password.length >= 8 },
    { label: 'One uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'One number', passed: /\d/.test(password) },
    { label: 'One special character', passed: /[^A-Za-z0-9]/.test(password) },
  ]
  const passwordScore = passwordChecks.filter(check => check.passed).length
  const passwordsMatch = password.length > 0 && password === confirmPassword
  const passwordReady = passwordChecks.every(check => check.passed) && passwordsMatch
  const selectedRole = availableRoles.find(option => option.value === role) || availableRoles[0]
  const canSubmit = passwordReady && !loading

  if (user) {
    return <Navigate to={getRoleDashboardPath(user.role)} replace />
  }

  const handleNurseChange = (field: keyof typeof nurseDetails, value: string | number) => {
    setNurseDetails(prev => ({ ...prev, [field]: value }))
  }

  const handleFacilityChange = (field: keyof typeof facilityDetails, value: string) => {
    setFacilityDetails(prev => ({ ...prev, [field]: value }))
  }

  const createRoleProfile = async (accessToken: string) => {
    const headers = { Authorization: `Bearer ${accessToken}` }

    if (role === 'nurse') {
      const payload: NurseProfileCreate = {
        full_name: `${nurseDetails.first_name.trim()} ${nurseDetails.last_name.trim()}`.trim(),
        phone: normalizePhone(accountPhone) || accountPhone,
        profession: nurseDetails.profession,
        license_number: nurseDetails.license_number,
        years_experience: Number(nurseDetails.years_experience),
        city: nurseDetails.city,
        availability_status: nurseDetails.availability_status,
      }
      await apiClient.post(userUrl('/nurses/profile'), payload, { headers })
      return
    }

    const postalCode = normalizePostalCode(facilityDetails.postal_code) || facilityDetails.postal_code
    const phone = normalizePhone(accountPhone) || accountPhone
    const facilityPayload: FacilityProfileCreate = {
      organization_name: facilityDetails.organization_name,
      facility_type: facilityDetails.facility_type,
      address: `${facilityDetails.street_address}, ${facilityDetails.province} ${postalCode}`.trim(),
      street_address: facilityDetails.street_address,
      city: facilityDetails.city,
      province: facilityDetails.province,
      postal_code: postalCode,
      contact_name: `${facilityDetails.contact_first_name.trim()} ${facilityDetails.contact_last_name.trim()}`.trim(),
      phone,
    }
    await apiClient.post(userUrl('/facilities/profile'), facilityPayload, { headers })
  }

  const validateRoleDetails = () => {
    if (!normalizePhone(accountPhone)) return 'Enter a valid phone number, such as 416-555-0184.'

    if (role === 'nurse') {
      const required = [nurseDetails.first_name, nurseDetails.last_name, nurseDetails.profession, nurseDetails.license_number, nurseDetails.city]
      if (required.some(value => !String(value).trim())) return 'Add your professional details before creating your account.'
      return null
    }

    const required = [
      facilityDetails.organization_name,
      facilityDetails.facility_type,
      facilityDetails.contact_first_name,
      facilityDetails.contact_last_name,
      facilityDetails.street_address,
      facilityDetails.city,
      facilityDetails.province,
      facilityDetails.postal_code,
    ]
    if (required.some(value => !String(value).trim())) return 'Add your organization details before creating your account.'
    if (!normalizePostalCode(facilityDetails.postal_code)) return 'Enter a valid Canadian postal code, such as M5V 2T6.'
    if (facilityDetails.province.trim().toLowerCase() !== 'ontario') return 'Province must be Ontario.'
    return null
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setSubmitError(null)

    if (!passwordReady) {
      setSubmitError('Create a stronger password and make sure both password fields match.')
      setLoading(false)
      return
    }

    const validationMessage = validateRoleDetails()
    if (validationMessage) {
      setSubmitError(validationMessage)
      setLoading(false)
      return
    }

    try {
      const authResponse = await register({ email, password, role })
      await createRoleProfile(authResponse.access_token)
      navigate(getRoleDashboardPath(role), {
        state: { message: 'Your account has been created and is pending administrator review.' },
      })
    } catch {
      setSubmitError('Unable to create account. Please verify your information and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 px-4 py-10">
      <div className="mx-auto grid w-full max-w-7xl gap-8 xl:grid-cols-[0.88fr_1.12fr]">
        <aside className="rounded-3xl border border-white/80 bg-white/85 p-8 shadow-sm shadow-slate-200/70 backdrop-blur xl:sticky xl:top-8 xl:self-start">
          <BrandMark />
          <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-slate-950">Create your Nivano Care account</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Choose your account type and add the details needed for healthcare staffing access.
          </p>
          <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
            Administrator access is managed internally.
          </p>

          <div className="mt-8 grid items-stretch gap-4 sm:grid-cols-2">
            {availableRoles.map(option => {
              const isSelected = role === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  className={`flex min-h-[190px] flex-col rounded-3xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                    isSelected ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-emerald-50 ring-1 ring-blue-100' : 'border-slate-200 bg-white'
                  }`}
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isSelected ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700'}`}>
                    <RoleIcon name={option.icon} />
                  </span>
                  <div className="mt-4">
                    <div className="text-lg font-extrabold text-slate-950">{option.label}</div>
                    <div className="mt-2 min-h-[72px] text-sm leading-6 text-slate-600">{option.description}</div>
                  </div>
                  <div className={`mt-auto inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${isSelected ? 'bg-white text-blue-700 shadow-sm' : 'bg-slate-50 text-slate-500'}`}>
                    {isSelected ? 'Selected' : 'Select role'}
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <PremiumCard title="Registration details" subtitle={`Set up secure access for the ${selectedRole.label.toLowerCase()} portal.`} accent="bg-gradient-to-r from-blue-700 via-cyan-600 to-teal-500">
          {(submitError || error) && (
            <Alert type="error" message={submitError || error || 'We could not create your account. Please try again.'} />
          )}

          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            <FormSection step="1" title="Account information" subtitle="Use a secure email and password for your Nivano Care account.">
              <div className="grid gap-4 md:grid-cols-2">
                <Input type="email" label="Email" value={email} onChange={event => setEmail(event.target.value)} required />
                <Input type="tel" label="Phone number" value={accountPhone} onChange={event => setAccountPhone(event.target.value)} required />
                <Input type="password" label="Password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} />
                <Input type="password" label="Confirm password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required minLength={8} />
              </div>

              <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-slate-900">Password requirements</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                    passwordScore === 5 && passwordsMatch ? 'bg-emerald-50 text-emerald-700' : passwordScore >= 4 ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {passwordScore === 5 && passwordsMatch ? 'Strong' : passwordScore >= 4 ? 'Good' : 'Needs attention'}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className={`h-full rounded-full transition-all ${passwordScore === 5 && passwordsMatch ? 'bg-emerald-500' : passwordScore >= 4 ? 'bg-blue-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.max(passwordScore, password ? 1 : 0) * 20}%` }}
                  />
                </div>
                <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  {passwordChecks.map(check => (
                    <div key={check.label} className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${check.passed ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {check.label}
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${passwordsMatch ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    Passwords match
                  </div>
                </div>
              </div>
            </FormSection>

            {role === 'nurse' ? (
              <FormSection step="2" title="Professional details" subtitle="Add your clinical details for matching and application review.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="First name" value={nurseDetails.first_name} onChange={event => handleNurseChange('first_name', event.target.value)} required />
                  <Input label="Last name" value={nurseDetails.last_name} onChange={event => handleNurseChange('last_name', event.target.value)} required />
                  <FieldSelect label="Profession" value={nurseDetails.profession} onChange={value => handleNurseChange('profession', value)} options={professionOptions} />
                  <Input label="License number" value={nurseDetails.license_number} onChange={event => handleNurseChange('license_number', event.target.value)} required />
                  <Input type="number" min={0} label="Years of experience" value={nurseDetails.years_experience} onChange={event => handleNurseChange('years_experience', Number(event.target.value))} required />
                  <FieldSelect label="City" value={nurseDetails.city} onChange={value => handleNurseChange('city', value)} options={ontarioCities} />
                  <FieldSelect label="Availability status" value={nurseDetails.availability_status} onChange={value => handleNurseChange('availability_status', value as AvailabilityStatus)} options={availabilityOptions} />
                </div>
              </FormSection>
            ) : (
              <>
                <FormSection step="2" title="Organization details" subtitle="Add the healthcare organization and primary contact for staffing requests.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input label="Organization name" value={facilityDetails.organization_name} onChange={event => handleFacilityChange('organization_name', event.target.value)} required />
                    <FieldSelect label="Organization type" value={facilityDetails.facility_type} onChange={value => handleFacilityChange('facility_type', value)} options={facilityTypes} />
                    <Input label="Primary contact first name" value={facilityDetails.contact_first_name} onChange={event => handleFacilityChange('contact_first_name', event.target.value)} required />
                    <Input label="Primary contact last name" value={facilityDetails.contact_last_name} onChange={event => handleFacilityChange('contact_last_name', event.target.value)} required />
                  </div>
                </FormSection>

                <FormSection step="3" title="Location" subtitle="Use the Ontario organization location where staffing requests will be coordinated.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input label="Street address" value={facilityDetails.street_address} onChange={event => handleFacilityChange('street_address', event.target.value)} required />
                    <FieldSelect label="City" value={facilityDetails.city} onChange={value => handleFacilityChange('city', value)} options={ontarioCities} />
                    <Input label="Province" value={facilityDetails.province} onChange={event => handleFacilityChange('province', event.target.value)} required />
                    <Input label="Postal code" value={facilityDetails.postal_code} onChange={event => handleFacilityChange('postal_code', event.target.value)} required />
                  </div>
                </FormSection>
              </>
            )}

            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-800">
              <p className="font-semibold text-emerald-950">Access review</p>
              <p className="mt-1">Your account will be created and sent for administrator review.</p>
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading} disabled={!canSubmit}>
              Create account
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            Already have an account? <Link to="/login" className="font-semibold text-blue-700">Sign in</Link>
          </div>
        </PremiumCard>
      </div>
    </div>
  )
}
