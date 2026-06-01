import { useEffect, useState } from 'react'
import axios from 'axios'
import apiClient, { shiftUrl, userUrl } from '../api/axios'
import { useAuth } from '../context/AuthContext'
import Input from '../components/Input'
import Select from '../components/Select'
import Button from '../components/Button'
import Alert from '../components/Alert'
import EmptyState from '../components/EmptyState'
import PremiumCard from '../components/PremiumCard'
import ClinicalIcon from '../components/ClinicalIcon'
import NextStepCard from '../components/NextStepCard'
import WorkflowStepper from '../components/WorkflowStepper'
import { RecordCard, SummaryMetric, TodayPanel, WorkspaceShell } from '../components/Workspace'
import PayPanel from '../components/PayPanel'
import InlineStatus from '../components/InlineStatus'
import { formatCompactDate, formatCompactTimeRange, formatDateRangeET, formatDateTimeET } from '../utils/dateTime'
import { formatClinicalRole } from '../utils/display'
import type { FacilityProfile, FacilityProfileCreate, Shift, ShiftCreate, ShiftUrgency } from '../types'

const urgencyOptions: Array<{ label: string; value: ShiftUrgency }> = [
  { label: 'Normal', value: 'normal' },
  { label: 'Urgent', value: 'urgent' },
]

type FacilityTab = 'overview' | 'profile' | 'post' | 'requests' | 'attendance'

const facilityTabs: Array<{ id: FacilityTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'profile', label: 'Organization Profile' },
  { id: 'post', label: 'New Request' },
  { id: 'requests', label: 'Staffing Requests' },
  { id: 'attendance', label: 'Attendance' },
]

const clinicalRoleOptions = [
  'Registered Nurse (RN)',
  'Registered Practical Nurse (RPN)',
  'Personal Support Worker (PSW)',
  'Nurse Practitioner (NP)',
  'Licensed Practical Nurse (LPN)',
  'Care Aide',
  'Other',
]

const careSettingOptions = [
  'Long-Term Care',
  'Hospital',
  'Emergency Department',
  'ICU',
  'Medical/Surgical',
  'Retirement Home',
  'Rehabilitation Centre',
  'Clinic',
  'Home Care',
  'Other',
]

const ontarioCityOptions = [
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
  'Other',
]

const credentialOptions = [
  'Nursing License',
  'CPR Certification',
  'First Aid Certification',
  'Vulnerable Sector Check',
  'Immunization Record',
  'Government ID',
  'BLS Certification',
  'ACLS Certification',
  'Other',
]

const defaultCredentialsByRole: Record<string, string[]> = {
  'Registered Nurse (RN)': ['Nursing License', 'CPR Certification'],
  'Registered Practical Nurse (RPN)': ['Nursing License', 'CPR Certification'],
  'Personal Support Worker (PSW)': ['Vulnerable Sector Check', 'First Aid Certification'],
}

const initialShiftForm: ShiftCreate = {
  role_required: '',
  unit_type: '',
  start_time: '',
  end_time: '',
  city: '',
  required_credentials: '',
  urgency: 'normal',
  notes: '',
}

function cleanDisplayName(value: string | null | undefined, fallback: string) {
  const text = (value || '').trim()
  if (!text || /phase|demo|test|string|mock|placeholder/i.test(text)) {
    return fallback
  }
  return text
}

function attendanceSummary(status: string) {
  switch (status) {
    case 'submitted':
      return 'Shift completion submitted for attendance verification.'
    case 'verified':
      return 'Attendance has been verified.'
    case 'arrival_confirmed':
      return 'Arrival confirmed; waiting for shift completion.'
    case 'disputed':
      return 'Attendance has been disputed.'
    default:
      return 'Attendance record has not started.'
  }
}

function splitCredentials(value?: string | null) {
  return (value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function dayGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

interface AttendanceRecordGroupProps {
  title: string
  records: Shift[]
  emptyTitle: string
  profileName: string
  attendanceActionId: string | null
  onAttendanceAction: (shiftId: string, action: 'verify-attendance' | 'dispute-attendance') => void
}

function AttendanceRecordGroup({
  title,
  records,
  emptyTitle,
  profileName,
  attendanceActionId,
  onAttendanceAction,
}: AttendanceRecordGroupProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-extrabold text-slate-950">{title}</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{records.length} records</span>
      </div>

      {records.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-slate-100 bg-slate-50 p-6">
          <EmptyState title={emptyTitle} message="Submitted and verified shift records will appear here." icon={<ClinicalIcon name="clock" />} />
        </div>
      ) : (
        <div className="mt-4 grid gap-4">
          {records.map(shift => (
            <RecordCard key={shift.id} className={shift.timesheet_status === 'submitted' ? 'border-amber-100' : 'border-emerald-100'}>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="text-lg font-semibold text-slate-900">{formatClinicalRole(shift.role_required)}</h4>
                    <InlineStatus status={shift.timesheet_status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{attendanceSummary(shift.timesheet_status)}</p>
                  <div className="mt-5 grid gap-4 text-sm text-slate-600 md:grid-cols-4">
                    <div>
                      <p className="font-semibold text-slate-900">Nurse</p>
                      <p className="mt-1">{cleanDisplayName(shift.confirmed_nurse_name, 'Nurse profile')}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Healthcare organization</p>
                      <p className="mt-1">{cleanDisplayName(shift.facility_name || profileName, 'Healthcare organization')}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Shift date/time</p>
                      <p className="mt-1">{formatDateRangeET(shift.start_time, shift.end_time)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Verified date</p>
                      <p className="mt-1">{shift.facility_verified_at ? formatDateTimeET(shift.facility_verified_at) : 'Pending verification'}</p>
                    </div>
                  </div>
                </div>

                {shift.timesheet_status === 'submitted' && (
                  <div className="flex shrink-0 flex-wrap gap-3">
                    <Button
                      onClick={() => onAttendanceAction(shift.id, 'verify-attendance')}
                      loading={attendanceActionId === shift.id}
                      disabled={attendanceActionId !== null}
                      size="md"
                    >
                      Verify Attendance
                    </Button>
                    <Button
                      onClick={() => onAttendanceAction(shift.id, 'dispute-attendance')}
                      disabled={attendanceActionId !== null}
                      variant="secondary"
                      size="md"
                    >
                      Dispute
                    </Button>
                  </div>
                )}
              </div>
            </RecordCard>
          ))}
        </div>
      )}
    </div>
  )
}

export default function FacilityDashboard() {
  const { user } = useAuth()
  const [profileMissing, setProfileMissing] = useState(false)
  const [profileForm, setProfileForm] = useState<FacilityProfileCreate>({
    organization_name: '',
    facility_type: '',
    address: '',
    street_address: '',
    city: '',
    province: 'Ontario',
    postal_code: '',
    contact_name: '',
    phone: '',
  })
  const [shifts, setShifts] = useState<Shift[]>([])
  const [shiftForm, setShiftForm] = useState<ShiftCreate>(initialShiftForm)
  const [roleSelection, setRoleSelection] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [careSettingSelection, setCareSettingSelection] = useState('')
  const [customCareSetting, setCustomCareSetting] = useState('')
  const [citySelection, setCitySelection] = useState('')
  const [customCity, setCustomCity] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [selectedCredentials, setSelectedCredentials] = useState<string[]>([])
  const [customCredential, setCustomCredential] = useState('')
  const [activeTab, setActiveTab] = useState<FacilityTab>('overview')
  const [loading, setLoading] = useState(true)
  const [attendanceActionId, setAttendanceActionId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      setMessage(null)

      try {
        const [profileResponse, shiftsResponse] = await Promise.all([
          apiClient.get<FacilityProfile>(userUrl('/facilities/me')),
          apiClient.get<Shift[]>(shiftUrl('/facilities/shifts')),
        ])
        setProfileForm({
          organization_name: profileResponse.data.organization_name,
          facility_type: profileResponse.data.facility_type,
          address: profileResponse.data.address,
          street_address: profileResponse.data.street_address || profileResponse.data.address,
          city: profileResponse.data.city,
          province: profileResponse.data.province || 'Ontario',
          postal_code: profileResponse.data.postal_code || '',
          contact_name: profileResponse.data.contact_name,
          phone: profileResponse.data.phone,
        })
        setShifts(shiftsResponse.data)
        setProfileMissing(false)
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setProfileMissing(true)
          try {
            const shiftsResponse = await apiClient.get<Shift[]>(shiftUrl('/facilities/shifts'))
            setShifts(shiftsResponse.data)
          } catch (inner) {
            console.error(inner)
          }
        } else {
          setError('Unable to load organization dashboard. Please refresh.')
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user])

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (profileMissing) {
        await apiClient.post<FacilityProfile>(userUrl('/facilities/profile'), profileForm)
        setMessage('Organization profile created successfully.')
        setProfileMissing(false)
      } else {
        await apiClient.patch<FacilityProfile>(userUrl('/facilities/me'), profileForm)
        setMessage('Organization profile updated successfully.')
      }
    } catch (err) {
      setError('Unable to save organization profile. Please check your information and try again.')
    } finally {
      setLoading(false)
    }
  }

  const refreshShifts = async () => {
    try {
      const shiftsResponse = await apiClient.get<Shift[]>(shiftUrl('/facilities/shifts'))
      setShifts(shiftsResponse.data)
    } catch (err) {
      console.error(err)
    }
  }

  const resetShiftForm = () => {
    setShiftForm(initialShiftForm)
    setRoleSelection('')
    setCustomRole('')
    setCareSettingSelection('')
    setCustomCareSetting('')
    setCitySelection('')
    setCustomCity('')
    setStartDate('')
    setStartTime('')
    setEndDate('')
    setEndTime('')
    setSelectedCredentials([])
    setCustomCredential('')
  }

  const toggleCredential = (credential: string) => {
    if (credential === 'Other') {
      setSelectedCredentials(prev => (
        prev.includes('Other') ? prev.filter(item => item !== 'Other') : [...prev, 'Other']
      ))
      return
    }

    setSelectedCredentials(prev => (
      prev.includes(credential) ? prev.filter(item => item !== credential) : [...prev, credential]
    ))
  }

  const applyRoleSelection = (value: string) => {
    setRoleSelection(value)
    const role = value === 'Other' ? customRole : value
    handleShiftChange('role_required', role)
    if (value !== 'Other') {
      setCustomRole('')
      setSelectedCredentials(defaultCredentialsByRole[value] || [])
    }
  }

  const buildDateTime = (date: string, time: string) => {
    return date && time ? `${date}T${time}` : ''
  }

  const handleShiftSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const role = (roleSelection === 'Other' ? customRole : roleSelection).trim()
      const careSetting = (careSettingSelection === 'Other' ? customCareSetting : careSettingSelection).trim()
      const city = (citySelection === 'Other' ? customCity : citySelection).trim()
      const startDateTime = buildDateTime(startDate, startTime)
      const endDateTime = buildDateTime(endDate, endTime)
      const selectedNamedCredentials = selectedCredentials.filter(credential => credential !== 'Other')
      const credentialList = [
        ...selectedNamedCredentials,
        ...(selectedCredentials.includes('Other') && customCredential.trim() ? [customCredential.trim()] : []),
      ]

      if (roleSelection === 'Other' && !customRole.trim()) {
        setError('Enter a clinical role before posting.')
        return
      }

      if (careSettingSelection === 'Other' && !customCareSetting.trim()) {
        setError('Enter a care setting before posting.')
        return
      }

      if (citySelection === 'Other' && !customCity.trim()) {
        setError('Enter a city before posting.')
        return
      }

      if (selectedCredentials.includes('Other') && !customCredential.trim()) {
        setError('Add a custom credential before posting.')
        return
      }

      if (!role || !careSetting || !city) {
        setError('Add the clinical role, care setting, and city before posting.')
        return
      }

      if (credentialList.length === 0) {
        setError('Select at least one credential requirement.')
        return
      }

      if (!startDateTime || !endDateTime) {
        setError('Start and end date/time are required.')
        return
      }

      const start = new Date(startDateTime)
      const end = new Date(endDateTime)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
        setError('End time must be after start time.')
        return
      }
      const payload = {
        ...shiftForm,
        role_required: role,
        unit_type: careSetting,
        city,
        required_credentials: credentialList.join(', '),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      }
      await apiClient.post<Shift>(shiftUrl('/shifts'), payload)
      await refreshShifts()
      resetShiftForm()
      setMessage('Shift posted successfully.')
    } catch (err) {
      setError('Unable to post shift. Please check the details and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAttendanceAction = async (shiftId: string, action: 'verify-attendance' | 'dispute-attendance') => {
    setAttendanceActionId(shiftId)
    setError(null)
    setMessage(null)

    try {
      await apiClient.post(shiftUrl(`/shifts/${shiftId}/${action}`))
      await refreshShifts()
      setMessage(action === 'verify-attendance' ? 'Attendance verified successfully.' : 'Attendance marked as disputed.')
    } catch (err) {
      setError(action === 'verify-attendance' ? 'Unable to verify attendance. Please try again.' : 'Unable to dispute attendance. Please try again.')
    } finally {
      setAttendanceActionId(null)
    }
  }

  const handleProfileChange = (field: keyof FacilityProfileCreate, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }))
  }

  const handleShiftChange = (field: keyof ShiftCreate, value: string) => {
    setShiftForm(prev => ({ ...prev, [field]: value }))
  }

  const profileExists = !profileMissing && !!profileForm.organization_name
  const pendingAttendanceCount = shifts.filter(shift => shift.timesheet_status === 'submitted').length
  const verifiedAttendanceCount = shifts.filter(shift => shift.timesheet_status === 'verified').length
  const attendanceRecords = shifts.filter(shift => ['submitted', 'verified', 'disputed'].includes(shift.timesheet_status))
  const pendingAttendanceRecords = attendanceRecords.filter(shift => shift.timesheet_status === 'submitted' || shift.timesheet_status === 'disputed')
  const verifiedAttendanceRecords = attendanceRecords.filter(shift => shift.timesheet_status === 'verified')
  const facilityStep = !profileExists ? 0 : shifts.length === 0 ? 1 : shifts.some(shift => shift.status === 'confirmed') ? 3 : 2
  const facilityNextStep = !profileExists
    ? { title: 'Add your organization profile', description: 'Add your organization details to start creating staffing requests.', actionLabel: 'Add organization profile', tab: 'profile' as FacilityTab }
    : shifts.length === 0
      ? { title: 'Create a new staffing request', description: 'Share the role, unit, schedule, and requirements for your next coverage need.', actionLabel: 'New request', tab: 'post' as FacilityTab }
      : pendingAttendanceCount > 0
        ? { title: 'Verify attendance', description: 'Submitted shift records are ready for attendance review.', actionLabel: 'Review attendance', tab: 'attendance' as FacilityTab }
        : { title: 'Monitor coverage', description: 'Track request status and confirmed coverage.', actionLabel: 'View requests', tab: 'requests' as FacilityTab }

  return (
    <WorkspaceShell
      title={profileExists ? `${dayGreeting()}, ${cleanDisplayName(profileForm.organization_name, 'Toronto Care Centre')}` : 'Healthcare Organization Dashboard'}
      subtitle={profileExists ? 'Manage staffing requests, coverage status, and attendance verification.' : 'Create staffing requests, monitor coverage, and verify completed attendance.'}
      roleLabel="Organization workspace"
      status={<InlineStatus status={user?.status || 'pending'} />}
      primaryAction={<Button onClick={() => setActiveTab(facilityNextStep.tab)} size="md">{facilityNextStep.actionLabel}</Button>}
      tabs={facilityTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      aside={
        <TodayPanel title="Organization priorities">
          <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 p-4">
            <p className="font-bold text-slate-950">{facilityNextStep.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{facilityNextStep.description}</p>
            <Button onClick={() => setActiveTab(facilityNextStep.tab)} size="sm" className="mt-4">
              {facilityNextStep.actionLabel}
            </Button>
          </div>
          <div className="grid gap-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm">
              <p className="font-bold text-slate-950">{shifts.filter(shift => shift.status === 'open').length} open requests</p>
              <p className="mt-1 text-slate-500">Coverage still in progress.</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm">
              <p className="font-bold text-slate-950">{pendingAttendanceCount} attendance pending</p>
              <p className="mt-1 text-slate-500">Submitted records ready for review.</p>
            </div>
          </div>
        </TodayPanel>
      }
    >

        {(error || message) && (
          <div className="space-y-4">
            {error && <Alert type="error" message={error} />}
            {message && <Alert type="success" message={message} />}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <PremiumCard
              title="Coverage operations workspace"
              subtitle="Create staffing requests, monitor coverage, and verify completed attendance."
              accent="bg-gradient-to-r from-blue-700 via-cyan-600 to-teal-500"
            >
              <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex flex-wrap items-center gap-3">
                  <InlineStatus status={user?.status || 'pending'} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                    {profileExists ? cleanDisplayName(profileForm.organization_name, 'Healthcare organization') : 'Organization profile needed'}
                  </span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                    {profileExists ? profileForm.city || 'Ontario' : 'Location pending'}
                  </span>
                </div>
                <Button onClick={() => setActiveTab(facilityNextStep.tab)} size="md">
                  {facilityNextStep.actionLabel}
                </Button>
              </div>
            </PremiumCard>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <SummaryMetric label="Organization profile" value={profileExists ? 'Ready' : 'Needs details'} helper={profileExists ? 'Organization details saved' : 'Add organization details'} icon={<ClinicalIcon name="building" />} tone="blue" />
              <SummaryMetric label="Open requests" value={shifts.filter(shift => shift.status === 'open').length} helper="Coverage requests in progress" icon={<ClinicalIcon name="activity" />} tone="teal" />
              <SummaryMetric label="Confirmed coverage" value={shifts.filter(shift => shift.status === 'confirmed').length} helper="Approved matches" icon={<ClinicalIcon name="shield" />} tone="emerald" />
              <SummaryMetric label="Attendance" value={pendingAttendanceCount} helper="Awaiting verification" icon={<ClinicalIcon name="clock" />} tone={pendingAttendanceCount > 0 ? 'amber' : 'slate'} />
            </div>
            <WorkflowStepper steps={['Organization profile', 'New request', 'Coverage status', 'Attendance verification']} currentStep={facilityStep} />
            <NextStepCard
              title={facilityNextStep.title}
              description={facilityNextStep.description}
              actionLabel={facilityNextStep.actionLabel}
              onAction={() => setActiveTab(facilityNextStep.tab)}
            />
          </div>
        )}

        {activeTab === 'profile' && (
            <PremiumCard title="Organization profile" subtitle="Keep your organization details current for staffing requests and coverage updates." accent="bg-gradient-to-r from-blue-500 to-emerald-400">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">Profile status</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{profileMissing ? 'Not created' : 'Ready to publish'}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                  {profileMissing ? 'Not created' : 'Profile ready'}
                </span>
              </div>

              {profileExists ? (
                <div className="mt-6 grid gap-4 rounded-3xl bg-slate-50 p-5">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-500 font-semibold">Organization</p>
                      <p className="mt-3 text-lg font-semibold text-slate-900">{profileForm.organization_name}</p>
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-500 font-semibold">Organization type</p>
                      <p className="mt-3 text-lg font-semibold text-slate-900">{profileForm.facility_type}</p>
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-500 font-semibold">City</p>
                      <p className="mt-3 text-lg font-semibold text-slate-900">{profileForm.city}</p>
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-500 font-semibold">Postal code</p>
                      <p className="mt-3 text-lg font-semibold text-slate-900">{profileForm.postal_code || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-slate-500 font-semibold">Primary contact</p>
                      <p className="mt-3 text-lg font-semibold text-slate-900">{profileForm.contact_name}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-slate-700">
                  <p className="font-semibold text-slate-900">Organization profile not added</p>
                  <p className="mt-2 text-sm">Add organization details to start posting coverage needs.</p>
                </div>
              )}

              <div className="mt-6 rounded-3xl bg-slate-50 p-6">
                <h3 className="text-lg font-semibold text-slate-900">Organization details</h3>
                <p className="mt-2 text-sm text-slate-600">Keep organization information current for coverage updates.</p>
                <form className="mt-6 grid gap-6" onSubmit={handleProfileSubmit}>
                <div className="grid gap-6 md:grid-cols-2">
                  <Input
                    label="Organization name"
                    value={profileForm.organization_name}
                    onChange={e => handleProfileChange('organization_name', e.target.value)}
                    required
                  />
                  <Input
                    label="Organization type"
                    value={profileForm.facility_type}
                    onChange={e => handleProfileChange('facility_type', e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Input
                    label="Street address"
                    value={profileForm.street_address || ''}
                    onChange={e => {
                      handleProfileChange('street_address', e.target.value)
                      handleProfileChange('address', `${e.target.value}, ${profileForm.province || 'Ontario'} ${profileForm.postal_code || ''}`.trim())
                    }}
                    required
                  />
                  <Input
                    label="City"
                    value={profileForm.city}
                    onChange={e => handleProfileChange('city', e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Input
                    label="Province"
                    value={profileForm.province || 'Ontario'}
                    onChange={e => handleProfileChange('province', e.target.value)}
                    required
                  />
                  <Input
                    label="Postal code"
                    value={profileForm.postal_code || ''}
                    onChange={e => {
                      handleProfileChange('postal_code', e.target.value)
                      handleProfileChange('address', `${profileForm.street_address || profileForm.address}, ${profileForm.province || 'Ontario'} ${e.target.value}`.trim())
                    }}
                    required
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Input
                    label="Primary contact"
                    value={profileForm.contact_name}
                    onChange={e => handleProfileChange('contact_name', e.target.value)}
                    required
                  />
                  <Input
                    label="Phone number"
                    type="tel"
                    value={profileForm.phone}
                    onChange={e => handleProfileChange('phone', e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" loading={loading} size="lg" fullWidth>
                  Save organization profile
                </Button>
                </form>
            </div>
          </PremiumCard>
        )}

        {activeTab === 'post' && (
              <PremiumCard title="Create staffing request" subtitle="Share the role, unit, schedule, and requirements for your next coverage need." accent="bg-gradient-to-r from-blue-700 via-cyan-600 to-teal-500">
            <div className="border-b border-slate-200 pb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Staffing request</p>
              <p className="mt-2 text-slate-600">Create a structured coverage request for qualified clinical workers.</p>
              <p className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                Estimated nurse payout will be calculated after posting.
              </p>
            </div>
            <form className="grid gap-6 pt-5" onSubmit={handleShiftSubmit}>
              <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-950">Coverage details</h3>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Select
                    label="Clinical role"
                    value={roleSelection}
                    onChange={e => applyRoleSelection(e.target.value)}
                    options={clinicalRoleOptions.map(option => ({ value: option, label: option }))}
                    required
                  />
                  {roleSelection === 'Other' && (
                    <Input
                      label="Enter clinical role"
                      value={customRole}
                      onChange={e => {
                        setCustomRole(e.target.value)
                        handleShiftChange('role_required', e.target.value)
                      }}
                      required
                    />
                  )}
                  <Select
                    label="Care setting"
                    value={careSettingSelection}
                    onChange={e => {
                      setCareSettingSelection(e.target.value)
                      handleShiftChange('unit_type', e.target.value === 'Other' ? customCareSetting : e.target.value)
                      if (e.target.value !== 'Other') setCustomCareSetting('')
                    }}
                    options={careSettingOptions.map(option => ({ value: option, label: option }))}
                    required
                  />
                  {careSettingSelection === 'Other' && (
                    <Input
                      label="Enter care setting"
                      value={customCareSetting}
                      onChange={e => {
                        setCustomCareSetting(e.target.value)
                        handleShiftChange('unit_type', e.target.value)
                      }}
                      required
                    />
                  )}
                  <Select
                    label="City"
                    value={citySelection}
                    onChange={e => {
                      setCitySelection(e.target.value)
                      handleShiftChange('city', e.target.value === 'Other' ? customCity : e.target.value)
                      if (e.target.value !== 'Other') setCustomCity('')
                    }}
                    options={ontarioCityOptions.map(option => ({ value: option, label: option }))}
                    required
                  />
                  {citySelection === 'Other' && (
                    <Input
                      label="Enter city"
                      value={customCity}
                      onChange={e => {
                        setCustomCity(e.target.value)
                        handleShiftChange('city', e.target.value)
                      }}
                      required
                    />
                  )}
                  <Select
                    label="Urgency"
                    value={shiftForm.urgency}
                    onChange={e => handleShiftChange('urgency', e.target.value)}
                    options={urgencyOptions.map(option => ({ value: option.value, label: option.label }))}
                  />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-950">Schedule</h3>
                <div className="mt-5 grid gap-4 md:grid-cols-4">
                  <Input label="Start date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                  <Input label="Start time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                  <Input label="End date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                  <Input label="End time" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                </div>
              </section>

              <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">Credential requirements</h3>
                    <p className="mt-1 text-sm text-slate-600">Select the documents expected before coverage is confirmed.</p>
                  </div>
                  {selectedCredentials.length > 0 && (
                    <p className="text-sm font-semibold text-blue-700">{selectedCredentials.filter(item => item !== 'Other').length} selected</p>
                  )}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {credentialOptions.map(credential => {
                    const checked = selectedCredentials.includes(credential)
                    return (
                      <label
                        key={credential}
                        className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          checked
                            ? 'border-blue-200 bg-blue-50 text-blue-800 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCredential(credential)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{credential}</span>
                      </label>
                    )
                  })}
                </div>
                {selectedCredentials.includes('Other') && (
                  <div className="mt-4">
                    <Input
                      label="Add custom credential"
                      value={customCredential}
                      onChange={e => setCustomCredential(e.target.value)}
                      required
                    />
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-950">Notes</h3>
                <label className="mt-4 block space-y-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">Notes for the care team</span>
                  <textarea
                    value={shiftForm.notes}
                    onChange={e => handleShiftChange('notes', e.target.value)}
                    className="h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </label>
              </section>

              <div className="pt-2">
                <Button type="submit" loading={loading} size="lg" fullWidth>Create staffing request</Button>
              </div>
            </form>
          </PremiumCard>
        )}

        {activeTab === 'requests' && (
        <section className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Staffing requests</h2>
              <p className="mt-2 text-slate-600">Track coverage status, estimated nurse pay, and attendance verification.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              {shifts.length} posted
            </span>
          </div>

          {shifts.length === 0 ? (
            <EmptyState title="No staffing requests posted yet" message="Create a staffing request to start coverage." icon={<ClinicalIcon name="clipboard" />} />
          ) : (
            <div className="mt-6 grid gap-4">
              {shifts.map(shift => (
                <RecordCard
                  key={shift.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">{formatClinicalRole(shift.role_required)}</h3>
                        <div className="text-sm text-slate-600">/ {shift.unit_type}</div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                        <span>{shift.city}</span>
                        <span>Date: {formatCompactDate(shift.start_time)}</span>
                        <span>Time: {formatCompactTimeRange(shift.start_time, shift.end_time)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        <div className="inline-flex items-center gap-2"><span className="font-semibold text-slate-500">Urgency:</span><InlineStatus status={shift.urgency} /></div>
                        <div className="inline-flex items-center gap-2"><span className="font-semibold text-slate-500">Review:</span><InlineStatus status={shift.status} /></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-700">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="font-semibold text-slate-900">Required credentials</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {splitCredentials(shift.required_credentials).length > 0 ? (
                          splitCredentials(shift.required_credentials).map(credential => (
                            <span key={credential} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-100">
                              {credential}
                            </span>
                          ))
                        ) : (
                          <span>Not provided</span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="font-semibold text-slate-900">Notes</p>
                      <p className="mt-2">{shift.notes || 'No notes provided'}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <PayPanel
                      hourly={shift.estimated_hourly_rate}
                      total={shift.estimated_total_pay}
                      helper="Preview uses base unit rate, urgency, and zero experience premium."
                    />
                  </div>
                  {['confirmed', 'completed'].includes(shift.status) && (
                    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-sm font-semibold text-blue-900">Attendance status</p>
                            <InlineStatus status={shift.timesheet_status || 'not_started'} />
                          </div>
                          <p className="mt-2 text-sm text-blue-800">
                            {shift.timesheet_status === 'submitted'
                              ? 'Shift completion submitted for attendance verification.'
                              : shift.timesheet_status === 'verified'
                                ? 'Attendance has been verified.'
                                : shift.timesheet_status === 'arrival_confirmed'
                                  ? 'Nurse arrival is confirmed; waiting for shift submission.'
                                  : shift.timesheet_status === 'disputed'
                                    ? 'Attendance has been disputed.'
                                    : 'Waiting for nurse arrival confirmation.'}
                          </p>
                        </div>

                        {shift.timesheet_status === 'submitted' && (
                          <div className="flex flex-wrap gap-3">
                            <Button
                              onClick={() => handleAttendanceAction(shift.id, 'verify-attendance')}
                              loading={attendanceActionId === shift.id}
                              disabled={attendanceActionId !== null}
                              size="md"
                            >
                              Verify Attendance
                            </Button>
                            <Button
                              onClick={() => handleAttendanceAction(shift.id, 'dispute-attendance')}
                              disabled={attendanceActionId !== null}
                              variant="secondary"
                              size="md"
                            >
                              Dispute
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </RecordCard>
              ))}
            </div>
          )}
        </section>
        )}

        {activeTab === 'attendance' && (
        <section className="rounded-3xl bg-white p-8 shadow-sm shadow-slate-200/70">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">Attendance verification</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Review submitted shift records and verify completed coverage.</p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <SummaryMetric label="Pending verification" value={pendingAttendanceCount} helper="Awaiting verification" icon={<ClinicalIcon name="clock" />} tone={pendingAttendanceCount > 0 ? 'amber' : 'slate'} />
            <SummaryMetric label="Verified attendance" value={verifiedAttendanceCount} helper="Completed records" icon={<ClinicalIcon name="badge" />} tone="emerald" />
            <SummaryMetric label="Attendance records" value={attendanceRecords.length} helper="Submitted and verified" icon={<ClinicalIcon name="clipboard" />} tone="blue" />
          </div>

          {attendanceRecords.length === 0 ? (
            <div className="mt-6">
              <EmptyState title="No attendance records waiting for verification" message="Submitted and verified shift records will appear here." icon={<ClinicalIcon name="clock" />} />
            </div>
          ) : (
            <div className="mt-8 space-y-8">
              <AttendanceRecordGroup
                title="Pending verification"
                records={pendingAttendanceRecords}
                emptyTitle="No attendance records waiting for verification"
                profileName={profileForm.organization_name}
                attendanceActionId={attendanceActionId}
                onAttendanceAction={handleAttendanceAction}
              />
              <AttendanceRecordGroup
                title="Verified attendance"
                records={verifiedAttendanceRecords}
                emptyTitle="No verified attendance records yet"
                profileName={profileForm.organization_name}
                attendanceActionId={attendanceActionId}
                onAttendanceAction={handleAttendanceAction}
              />
            </div>
          )}
        </section>
        )}
    </WorkspaceShell>
  )
}

