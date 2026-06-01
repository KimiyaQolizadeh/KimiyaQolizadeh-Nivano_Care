import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import apiClient, { complianceUrl, shiftUrl, userUrl } from '../api/axios'
import { useAuth } from '../context/AuthContext'
import Card from '../components/Card'
import Input from '../components/Input'
import Select from '../components/Select'
import Button from '../components/Button'
import Alert from '../components/Alert'
import EmptyState from '../components/EmptyState'
import PremiumCard from '../components/PremiumCard'
import ClinicalIcon from '../components/ClinicalIcon'
import NextStepCard from '../components/NextStepCard'
import WorkflowStepper from '../components/WorkflowStepper'
import { RecordCard, SectionHeader, SummaryMetric, TodayPanel, WorkspaceShell } from '../components/Workspace'
import PayPanel from '../components/PayPanel'
import InlineStatus from '../components/InlineStatus'
import { formatCompactDateTime, formatDateET, formatDateRangeET, formatDateTimeET } from '../utils/dateTime'
import { formatClinicalRole, getFriendlyApiError } from '../utils/display'
import type {
  AvailabilityStatus,
  Application,
  ComplianceDocument,
  ComplianceDocumentCreate,
  DocumentType,
  NurseProfile,
  NurseProfileCreate,
  Shift,
} from '../types'

const availabilityOptions: Array<{ label: string; value: AvailabilityStatus }> = [
  { label: 'Available', value: 'available' },
  { label: 'Unavailable', value: 'unavailable' },
  { label: 'On shift', value: 'on_shift' },
]

const documentTypeOptions: Array<{ label: string; value: DocumentType }> = [
  { label: 'Nursing License', value: 'license' },
  { label: 'CPR Certification', value: 'certification' },
  { label: 'First Aid Certification', value: 'certification' },
  { label: 'Vulnerable Sector Check', value: 'background_check' },
  { label: 'Immunization Record', value: 'vaccination' },
  { label: 'Government ID', value: 'other' },
  { label: 'BLS Certification', value: 'certification' },
  { label: 'ACLS Certification', value: 'certification' },
  { label: 'Other', value: 'other' },
]

type NurseTab = 'overview' | 'profile' | 'credentials' | 'available' | 'applications' | 'verification'

const nurseTabs: Array<{ id: NurseTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'profile', label: 'My Profile' },
  { id: 'credentials', label: 'Credentials' },
  { id: 'available', label: 'Opportunities' },
  { id: 'applications', label: 'Applications' },
  { id: 'verification', label: 'Shift Verification' },
]

function formatDate(value?: string | null) {
  return value ? formatDateET(value) : 'No expiry date'
}

function formatDocumentType(value: string) {
  const label = documentTypeOptions.find(option => option.value === value)?.label
  return label || value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) return 'Not available'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

function getFriendlyErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail
      if (typeof detail === 'string' && detail.trim()) {
      return getFriendlyApiError(detail, fallback)
    }
  }

  return fallback
}

function getFriendlyMatchReason(shift: Shift, profile: NurseProfileCreate) {
  if (shift.match_reason === 'Matched by profession and city' && profile.profession && profile.city) {
    return `Matched by ${profile.profession} profile and ${profile.city} location`
  }

  return shift.match_reason || 'Open shift available'
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || 'there'
}

function formatApplicationStatusLabel(status: string) {
  const labels: Record<string, string> = {
    applied: 'Application submitted',
    pending: 'Pending review',
    under_review: 'Application under review',
    approved: 'Application approved',
    confirmed: 'Coverage confirmed',
    rejected: 'Not selected',
    withdrawn: 'Withdrawn',
    completed: 'Completed',
  }

  return labels[status] || 'Application status unavailable'
}

function formatApplicationBadgeLabel(status: string) {
  const labels: Record<string, string> = {
    applied: 'Pending review',
    pending: 'Pending review',
    under_review: 'Pending review',
    approved: 'Approved',
    confirmed: 'Coverage confirmed',
    rejected: 'Not selected',
    withdrawn: 'Withdrawn',
    completed: 'Completed',
  }

  return labels[status] || 'Pending review'
}

function getApplicationCoverageLabel(status: string) {
  const labels: Record<string, string> = {
    applied: 'Awaiting confirmation',
    pending: 'Awaiting confirmation',
    under_review: 'Awaiting confirmation',
    approved: 'Confirmed',
    confirmed: 'Confirmed',
    rejected: 'Not selected',
    withdrawn: 'Withdrawn',
    completed: 'Completed',
  }

  return labels[status] || 'Awaiting confirmation'
}

export default function NurseDashboard() {
  const { user } = useAuth()
  const [profileMissing, setProfileMissing] = useState(false)
  const [profileForm, setProfileForm] = useState<NurseProfileCreate>({
    full_name: '',
    phone: '',
    profession: '',
    license_number: '',
    years_experience: 1,
    city: '',
    availability_status: 'available',
  })
  const [openShifts, setOpenShifts] = useState<Shift[]>([])
  const [confirmedShifts, setConfirmedShifts] = useState<Shift[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [documents, setDocuments] = useState<ComplianceDocument[]>([])
  const [activeTab, setActiveTab] = useState<NurseTab>('overview')
  const [credentialFile, setCredentialFile] = useState<File | null>(null)
  const [documentForm, setDocumentForm] = useState<ComplianceDocumentCreate>({
    document_type: 'license',
    file_name: '',
    file_url: '',
    expiry_date: '',
  })
  const [loading, setLoading] = useState(true)
  const [applyingShiftId, setApplyingShiftId] = useState<string | null>(null)
  const [withdrawingApplicationId, setWithdrawingApplicationId] = useState<string | null>(null)
  const [shiftVerificationActionId, setShiftVerificationActionId] = useState<string | null>(null)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const appliedShiftIds = useMemo(
    () => new Set(applications.filter(application => application.status !== 'withdrawn').map(application => application.shift_id)),
    [applications]
  )

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      setActionMessage(null)

      try {
        const [profileResponse, shiftsResponse, confirmedShiftsResponse, applicationsResponse, documentsResponse] = await Promise.all([
          apiClient.get<NurseProfile>(userUrl('/nurses/me')),
          apiClient.get<Shift[]>(shiftUrl('/shifts')),
          apiClient.get<Shift[]>(shiftUrl('/nurses/confirmed-shifts')),
          apiClient.get<Application[]>(shiftUrl('/nurses/applications')),
          apiClient.get<ComplianceDocument[]>(complianceUrl('/documents/me')),
        ])
        setProfileForm({
          full_name: profileResponse.data.full_name,
          phone: profileResponse.data.phone || '',
          profession: profileResponse.data.profession,
          license_number: profileResponse.data.license_number,
          years_experience: profileResponse.data.years_experience,
          city: profileResponse.data.city,
          availability_status: profileResponse.data.availability_status,
        })
        setOpenShifts(shiftsResponse.data)
        setConfirmedShifts(confirmedShiftsResponse.data)
        setApplications(applicationsResponse.data)
        setDocuments(documentsResponse.data)
        setProfileMissing(false)
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setProfileMissing(true)
          try {
            const [shiftsResponse, documentsResponse] = await Promise.all([
              apiClient.get<Shift[]>(shiftUrl('/shifts')),
              apiClient.get<ComplianceDocument[]>(complianceUrl('/documents/me')),
            ])
            setOpenShifts(shiftsResponse.data)
            setDocuments(documentsResponse.data)
          } catch (inner) {
            console.error(inner)
          }
        } else {
          setError('Unable to load nurse dashboard data. Please refresh.')
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user])

  const refreshApplications = async () => {
    try {
      const response = await apiClient.get<Application[]>(shiftUrl('/nurses/applications'))
      setApplications(response.data)
    } catch (err) {
      console.error(err)
    }
  }

  const refreshShifts = async () => {
    try {
      const response = await apiClient.get<Shift[]>(shiftUrl('/shifts'))
      setOpenShifts(response.data)
    } catch (err) {
      console.error(err)
    }
  }

  const refreshConfirmedShifts = async () => {
    try {
      const response = await apiClient.get<Shift[]>(shiftUrl('/nurses/confirmed-shifts'))
      setConfirmedShifts(response.data)
    } catch (err) {
      console.error(err)
    }
  }

  const refreshDocuments = async () => {
    try {
      const response = await apiClient.get<ComplianceDocument[]>(complianceUrl('/documents/me'))
      setDocuments(response.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setActionMessage(null)

    try {
      if (profileMissing) {
        await apiClient.post<NurseProfile>(userUrl('/nurses/profile'), profileForm)
        setProfileMissing(false)
        setActionMessage('Nurse profile created successfully.')
      } else {
        await apiClient.patch<NurseProfile>(userUrl('/nurses/me'), profileForm)
        setActionMessage('Nurse profile updated successfully.')
      }
    } catch (err) {
      setError('Unable to save profile. Please check your data and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async (shiftId: string) => {
    if (user?.status !== 'approved') {
      setError('Account approval required before applying to shifts.')
      return
    }

    setApplyingShiftId(shiftId)
    setError(null)
    setActionMessage(null)

    try {
      await apiClient.post(shiftUrl(`/shifts/${shiftId}/apply`))
      setActionMessage('Shift application submitted successfully.')
      await refreshApplications()
      await refreshShifts()
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Unable to apply for the shift. Try again later.'))
    } finally {
      setApplyingShiftId(null)
    }
  }

  const handleWithdrawApplication = async (applicationId: string) => {
    setWithdrawingApplicationId(applicationId)
    setError(null)
    setActionMessage(null)

    try {
      await apiClient.patch(shiftUrl(`/shifts/applications/${applicationId}/withdraw`))
      setActionMessage('Application withdrawn.')
      await refreshApplications()
      await refreshShifts()
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'This application can no longer be withdrawn because coverage has already been confirmed.'))
    } finally {
      setWithdrawingApplicationId(null)
    }
  }

  const handleShiftVerificationAction = async (shiftId: string, action: 'confirm-arrival' | 'end-shift') => {
    setShiftVerificationActionId(shiftId)
    setError(null)
    setActionMessage(null)

    try {
      await apiClient.post(shiftUrl(`/shifts/${shiftId}/${action}`))
      await refreshConfirmedShifts()
      setActionMessage(action === 'confirm-arrival' ? 'Arrival confirmed for this shift.' : 'Shift completion submitted for attendance verification.')
    } catch (err) {
      setError(action === 'confirm-arrival' ? 'Unable to confirm arrival. Please try again.' : 'Unable to submit shift completion. Please try again.')
    } finally {
      setShiftVerificationActionId(null)
    }
  }

  const handleDocumentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUploadingDocument(true)
    setError(null)
    setActionMessage(null)

    try {
      if (!credentialFile) {
        setError('Select a credential document before submitting.')
        return
      }

      const payload = new FormData()
      payload.append('document_type', documentForm.document_type)
      payload.append('file', credentialFile)
      if (documentForm.expiry_date) {
        payload.append('expiry_date', documentForm.expiry_date)
      }

      await apiClient.post<ComplianceDocument>(complianceUrl('/documents/upload'), payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setDocumentForm({
        document_type: 'license',
        file_name: '',
        file_url: '',
        expiry_date: '',
      })
      setCredentialFile(null)
      await refreshDocuments()
      setActionMessage('Credential submitted for review.')
    } catch (err) {
      setError('Unable to upload compliance document. Please check the details and try again.')
    } finally {
      setUploadingDocument(false)
    }
  }

  const handleInputChange = (field: keyof NurseProfileCreate, value: string | number) => {
    setProfileForm(prev => ({ ...prev, [field]: value }))
  }

  const handleDocumentInputChange = (field: keyof ComplianceDocumentCreate, value: string) => {
    setDocumentForm(prev => ({ ...prev, [field]: value }))
  }

  const profileExists = !profileMissing && !!profileForm.full_name
  const accountApproved = user?.status === 'approved'
  const canWithdrawApplication = (status: string) => ['applied', 'under_review', 'pending'].includes(status)
  const nurseStep = !profileExists ? 0 : documents.length === 0 ? 1 : applications.length === 0 ? 2 : confirmedShifts.length === 0 ? 3 : 4
  const nurseName = profileExists ? firstName(profileForm.full_name) : ''
  const nurseNextStep = !profileExists
    ? { title: 'Set up your professional profile', description: 'Add your role, license number, experience, and location so shift opportunities can be matched to you.', actionLabel: 'Edit my profile', tab: 'profile' as NurseTab }
    : documents.length === 0
      ? { title: 'Keep your credentials ready', description: 'Upload required documents for administrator review before shift confirmation.', actionLabel: 'Manage credentials', tab: 'credentials' as NurseTab }
      : applications.length === 0
        ? { title: 'Find your next shift opportunity', description: 'Browse available shifts and apply with your professional profile.', actionLabel: 'View opportunities', tab: 'available' as NurseTab }
        : confirmedShifts.length === 0
          ? { title: 'Track your applications', description: 'Coverage confirmations will appear after administrator review.', actionLabel: 'View applications', tab: 'applications' as NurseTab }
          : { title: 'Manage shift verification', description: 'Confirm arrival and submit shift completion when your work is finished.', actionLabel: 'Open verification', tab: 'verification' as NurseTab }
  const pendingCredentialCount = documents.filter(document => document.status === 'pending').length
  const approvedCredentialCount = documents.filter(document => document.status === 'approved').length
  const activeApplicationCount = applications.filter(application => ['applied', 'under_review', 'approved'].includes(application.status)).length
  const shiftNeedsVerification = confirmedShifts.some(shift => ['not_started', 'arrival_confirmed'].includes(shift.timesheet_status || 'not_started'))

  return (
    <WorkspaceShell
      title={profileExists ? `Hi ${nurseName}, ready for your next shift?` : 'Welcome to Nivano Care'}
      subtitle={profileExists ? 'Manage credentials, review available shifts, and track your shift activity.' : 'Set up your professional profile to start receiving relevant shift opportunities.'}
      roleLabel="Nurse portal"
      status={<InlineStatus status={user?.status || 'pending'} />}
      primaryAction={<Button onClick={() => setActiveTab(nurseNextStep.tab)} size="md">{nurseNextStep.actionLabel}</Button>}
      tabs={nurseTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      aside={
        <TodayPanel title="Your next best action">
          <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 p-4">
            <p className="font-bold text-slate-950">{nurseNextStep.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{nurseNextStep.description}</p>
            <Button onClick={() => setActiveTab(nurseNextStep.tab)} size="sm" className="mt-4">
              {nurseNextStep.actionLabel}
            </Button>
          </div>
          {!accountApproved && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
              Applications open after administrator approval.
            </div>
          )}
          {shiftNeedsVerification && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              A confirmed shift is ready for verification.
            </div>
          )}
        </TodayPanel>
      }
    >
        {/* Messages */}
        {!accountApproved && (
          <Alert
            type="info"
            message="Your account is pending approval. You can review shifts, but applications open after administrator approval."
          />
        )}
        {error && <Alert type="error" message={error} />}
        {actionMessage && <Alert type="success" message={actionMessage} />}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <PremiumCard
              title="Your clinical workspace"
              subtitle="Stay ready for coverage opportunities, credential review, applications, and shift verification."
              accent="bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600"
            >
              <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex flex-wrap items-center gap-3">
                  <InlineStatus status={user?.status || 'pending'} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                    {profileExists ? profileForm.profession || 'Nurse profile' : 'Profile needed'}
                  </span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                    {profileExists ? profileForm.city || 'Ontario' : 'Location pending'}
                  </span>
                </div>
                <Button onClick={() => setActiveTab(nurseNextStep.tab)} size="md">
                  {nurseNextStep.actionLabel}
                </Button>
              </div>
            </PremiumCard>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <SummaryMetric label="Profile status" value={profileExists ? 'Ready' : 'Needs details'} helper={profileExists ? 'Professional details saved' : 'Add your professional profile'} icon={<ClinicalIcon name="nurse" />} tone="blue" />
              <SummaryMetric label="Opportunities" value={openShifts.length} helper="Matched to your profile" icon={<ClinicalIcon name="activity" />} tone="teal" />
              <SummaryMetric label="Applications" value={activeApplicationCount} helper="Under review or confirmed" icon={<ClinicalIcon name="clipboard" />} tone="emerald" />
              <SummaryMetric label="Credentials" value={approvedCredentialCount} helper="Approved documents" icon={<ClinicalIcon name="shield" />} tone={pendingCredentialCount > 0 ? 'amber' : 'blue'} />
            </div>
            <WorkflowStepper steps={['Professional profile', 'Credentials', 'Opportunities', 'Applications', 'Shift verification']} currentStep={nurseStep} />
            <NextStepCard
              title={nurseNextStep.title}
              description={nurseNextStep.description}
              actionLabel={nurseNextStep.actionLabel}
              onAction={() => setActiveTab(nurseNextStep.tab)}
            />
          </div>
        )}

        {activeTab === 'verification' && (
        <PremiumCard
          title="Shift Verification"
          subtitle="Confirm arrival, submit shift completion, and track attendance verification."
          accent="bg-gradient-to-r from-emerald-500 to-blue-500"
          className="space-y-5"
        >
          {confirmedShifts.length === 0 ? (
            <EmptyState title="No confirmed shifts" message="Confirmed assignments will appear here for arrival and shift submission." icon={<ClinicalIcon name="calendar" />} />
          ) : (
            <div className="grid gap-4">
              {confirmedShifts.map(shift => {
                const shiftVerificationStatus = shift.timesheet_status || 'not_started'
                const canConfirmArrival = shiftVerificationStatus === 'not_started'
                const canEndShift = shiftVerificationStatus === 'arrival_confirmed'

                return (
                  <div key={shift.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-extrabold text-slate-900">{formatClinicalRole(shift.role_required)}</h3>
                          <InlineStatus status={shift.status} />
                          <InlineStatus status={shiftVerificationStatus} />
                        </div>
                        <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><ClinicalIcon name="building" className="h-4 w-4 text-blue-600" />{shift.unit_type} / {shift.city}</p>
                        <p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><ClinicalIcon name="clock" className="h-4 w-4 text-blue-600" />{formatDateRangeET(shift.start_time, shift.end_time)}</p>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Estimated pay</p>
                            <p className="mt-2 text-lg font-extrabold text-slate-900">{formatCurrency(shift.estimated_total_pay)}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Arrival</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">{shift.arrival_confirmed_at ? formatDateTimeET(shift.arrival_confirmed_at) : 'Not confirmed'}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Attendance review</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">{shift.facility_verified_at ? formatDateTimeET(shift.facility_verified_at) : 'Pending'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 lg:w-64">
                        {canConfirmArrival && (
                          <Button
                            onClick={() => handleShiftVerificationAction(shift.id, 'confirm-arrival')}
                            loading={shiftVerificationActionId === shift.id}
                            disabled={shiftVerificationActionId !== null}
                            size="md"
                            fullWidth
                          >
                            Confirm Arrival
                          </Button>
                        )}
                        {canEndShift && (
                          <Button
                            onClick={() => handleShiftVerificationAction(shift.id, 'end-shift')}
                            loading={shiftVerificationActionId === shift.id}
                            disabled={shiftVerificationActionId !== null}
                            size="md"
                            fullWidth
                          >
                            End shift and submit completion
                          </Button>
                        )}
                        {shiftVerificationStatus === 'submitted' && (
                          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                            Shift completion submitted. Waiting for attendance verification.
                          </div>
                        )}
                        {shiftVerificationStatus === 'verified' && (
                          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                            Attendance verified.
                          </div>
                        )}
                        {shiftVerificationStatus === 'disputed' && (
                          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                            Attendance has been disputed.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </PremiumCard>
        )}

        {/* Profile Section */}
        {activeTab === 'profile' && (
        <Card className="space-y-8">
          <SectionHeader title="My professional profile" subtitle="Keep your clinical details current for matching and applications." />
          {profileExists && (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                  <p className="text-xs font-semibold text-slate-500">Profession</p>
                  <p className="mt-2 min-h-[30px] text-base font-semibold leading-7 text-slate-900">{profileForm.profession}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                  <p className="text-xs font-semibold text-slate-500">Phone number</p>
                  <p className="mt-2 min-h-[30px] text-base font-semibold leading-7 text-slate-900">{profileForm.phone || 'Not provided'}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                  <p className="text-xs font-semibold text-slate-500">City</p>
                  <p className="mt-2 min-h-[30px] text-base font-semibold leading-7 text-slate-900">{profileForm.city}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                  <p className="text-xs font-semibold text-slate-500">Experience</p>
                  <p className="mt-2 min-h-[30px] text-base font-semibold leading-7 text-slate-900">{profileForm.years_experience} years</p>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                  <p className="text-xs font-semibold text-slate-500">Availability</p>
                  <div className="mt-2 flex min-h-[30px] items-center">
                    <InlineStatus status={profileForm.availability_status} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-lg font-semibold text-slate-900">Profile details</h3>
            <p className="mt-2 text-sm text-slate-600">Add your clinical role, license number, experience, and location.</p>
            <form className="mt-6 grid gap-6" onSubmit={handleProfileSubmit}>
              <div className="grid gap-6 md:grid-cols-2">
                <Input
                  label="Full name"
                  value={profileForm.full_name}
                  onChange={e => handleInputChange('full_name', e.target.value)}
                  required
                />
                <Input
                  label="Phone number"
                  value={profileForm.phone || ''}
                  onChange={e => handleInputChange('phone', e.target.value)}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Input
                  label="Profession"
                  value={profileForm.profession}
                  onChange={e => handleInputChange('profession', e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Input
                  label="License number"
                  value={profileForm.license_number}
                  onChange={e => handleInputChange('license_number', e.target.value)}
                  required
                />
                <Input
                  label="Years of experience"
                  type="number"
                  min={0}
                  value={profileForm.years_experience}
                  onChange={e => handleInputChange('years_experience', Number((e.target as HTMLInputElement).value))}
                  required
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Input
                  label="City"
                  value={profileForm.city}
                  onChange={e => handleInputChange('city', e.target.value)}
                  required
                />
                <Select
                  label="Availability"
                  value={profileForm.availability_status}
                  onChange={e => handleInputChange('availability_status', e.target.value)}
                  options={availabilityOptions.map(opt => ({ value: opt.value, label: opt.label }))}
                />
              </div>

              <Button type="submit" loading={loading} size="lg" fullWidth>
                Save profile
              </Button>
            </form>
          </div>
        </Card>
        )}

        {activeTab === 'credentials' && (
        <PremiumCard
          title="Credentials"
          subtitle="Submit required documents for administrator review."
          accent="bg-gradient-to-r from-blue-600 to-teal-500"
          className="space-y-8"
        >
          <Alert
            type="info"
            message={documents.some(document => document.status === 'pending') ? 'Your credentials are under review.' : 'Upload required credentials for clinical assignments.'}
          />

          <form className="grid gap-6 rounded-3xl border border-slate-100 bg-slate-50 p-6" onSubmit={handleDocumentSubmit}>
            <div className="grid gap-6 md:grid-cols-2">
              <Select
                label="Document type"
                value={documentForm.document_type}
                onChange={e => handleDocumentInputChange('document_type', e.target.value)}
                options={documentTypeOptions}
              />
              <label className="block space-y-2">
                <span className="block text-sm font-semibold text-slate-900">Upload document</span>
                <input
                  type="file"
                  onChange={e => setCredentialFile(e.target.files?.[0] || null)}
                  className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 text-slate-900 shadow-sm file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-blue-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  required
                />
                {credentialFile && <p className="text-sm text-slate-500">{credentialFile.name}</p>}
              </label>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Input
                label="Expiry date"
                type="date"
                value={documentForm.expiry_date}
                onChange={e => handleDocumentInputChange('expiry_date', e.target.value)}
                required
              />
            </div>

            <Button type="submit" loading={uploadingDocument} size="lg" fullWidth>
              Upload credential
            </Button>
          </form>

          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Uploaded documents</h3>
                <p className="mt-1 text-sm text-slate-600">Track admin review status and expiry dates.</p>
              </div>
              <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">{documents.length} total</span>
            </div>

            {documents.length === 0 ? (
              <div className="mt-6">
                <EmptyState title="No credential documents yet" message="Credential documents will appear here." />
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                {documents.map(document => (
                  <div key={document.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-500">{formatDocumentType(document.document_type)}</p>
                        <a href={document.file_url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-lg font-semibold text-slate-900 hover:text-blue-700" title={document.file_name}>
                          {document.file_name}
                        </a>
                        <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-xs font-semibold text-slate-500">Expiry</p>
                            <p className="mt-2 whitespace-nowrap font-semibold text-slate-900">{formatDate(document.expiry_date)}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-xs font-semibold text-slate-500">Uploaded</p>
                            <p className="mt-2 whitespace-nowrap font-semibold text-slate-900">{formatDateTimeET(document.uploaded_at)}</p>
                          </div>
                        </div>
                      </div>
                      <InlineStatus status={document.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PremiumCard>
        )}

        {/* Shift Opportunities */}
        {activeTab === 'available' && (
        <Card>
          <SectionHeader title="Available shifts" subtitle="Open shifts matched to your role and location." />
          {loading ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">Loading shifts...</div>
          ) : openShifts.length === 0 ? (
            <div className="mt-6"><EmptyState title="No available shifts right now" message="New opportunities will appear here." icon={<ClinicalIcon name="activity" />} /></div>
          ) : (
            <div className="mt-6 space-y-4">
              {openShifts.map(shift => (
                <RecordCard key={shift.id} className="space-y-4">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-extrabold text-slate-900">{formatClinicalRole(shift.role_required)}</h3>
                          <p className="mt-1 text-sm text-slate-600">{shift.unit_type} / {shift.city}</p>
                          <p className="mt-1 text-sm text-slate-600">{formatDateRangeET(shift.start_time, shift.end_time)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <InlineStatus status={shift.urgency} />
                          <InlineStatus status={shift.status} />
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Button
                        onClick={() => handleApply(shift.id)}
                        disabled={!accountApproved || appliedShiftIds.has(shift.id) || applyingShiftId !== null}
                        loading={applyingShiftId === shift.id}
                        variant={!accountApproved || appliedShiftIds.has(shift.id) ? 'secondary' : 'primary'}
                        size="md"
                        className="whitespace-nowrap"
                      >
                        {!accountApproved ? 'Approval required' : appliedShiftIds.has(shift.id) ? 'Application sent' : 'Apply'}
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                    <p className="font-semibold text-slate-900">Required credentials</p>
                    <p className="mt-1 text-slate-600">{shift.required_credentials}</p>
                  </div>
                  <PayPanel
                    hourly={shift.estimated_hourly_rate}
                    total={shift.estimated_total_pay}
                    helper="Estimated based on unit, urgency, and profile experience."
                  />
                  <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                    Match reason: {getFriendlyMatchReason(shift, profileForm)}
                  </div>
                </RecordCard>
              ))}
            </div>
          )}
        </Card>
        )}

        {/* Applications */}
        {activeTab === 'applications' && (
        <Card>
          <SectionHeader title="My applications" subtitle="Track your applications and coverage confirmations." />
          {applications.length === 0 ? (
            <div className="mt-6"><EmptyState title="No applications yet" message="Applications you submit for available shifts will appear here." icon={<ClinicalIcon name="clipboard" />} /></div>
          ) : (
            <div className="mt-6 space-y-4">
              {applications.map(application => (
                <RecordCard key={application.id} className="border-blue-100/80 bg-white">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold tracking-tight text-slate-950">{formatApplicationStatusLabel(application.status)}</h3>
                      <p className="mt-1 text-sm text-slate-500">Shift application</p>
                    </div>
                    <InlineStatus status={application.status} label={formatApplicationBadgeLabel(application.status)} />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-500">Submitted</p>
                      <p className="mt-2 whitespace-nowrap text-sm font-semibold text-slate-950">
                        {formatCompactDateTime(application.applied_at)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-500">Review</p>
                      <p className="mt-2 whitespace-nowrap text-sm font-semibold text-slate-950">
                        {application.reviewed_at ? formatCompactDateTime(application.reviewed_at) : 'Pending review'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-500">Coverage</p>
                      <p className="mt-2 whitespace-nowrap text-sm font-semibold text-slate-950">
                        {getApplicationCoverageLabel(application.status)}
                      </p>
                    </div>
                  </div>
                  {canWithdrawApplication(application.status) && (
                    <div className="mt-5 flex justify-end border-t border-slate-100 pt-5">
                      <Button
                        onClick={() => handleWithdrawApplication(application.id)}
                        loading={withdrawingApplicationId === application.id}
                        disabled={withdrawingApplicationId !== null}
                        variant="secondary"
                        size="sm"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                      >
                        Withdraw application
                      </Button>
                    </div>
                  )}
                </RecordCard>
              ))}
            </div>
          )}
        </Card>
        )}
    </WorkspaceShell>
  )
}

