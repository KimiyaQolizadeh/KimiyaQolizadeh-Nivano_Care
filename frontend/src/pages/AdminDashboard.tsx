import { useEffect, useState } from 'react'
import apiClient, { complianceUrl, shiftUrl, userUrl } from '../api/axios'
import { useAuth } from '../context/AuthContext'
import DataCard from '../components/DataCard'
import EmptyState from '../components/EmptyState'
import MetricCard from '../components/MetricCard'
import Button from '../components/Button'
import PremiumCard from '../components/PremiumCard'
import Alert from '../components/Alert'
import ClinicalIcon from '../components/ClinicalIcon'
import NextStepCard from '../components/NextStepCard'
import WorkflowStepper from '../components/WorkflowStepper'
import PayPanel from '../components/PayPanel'
import InlineStatus from '../components/InlineStatus'
import { RecordCard, SummaryMetric, TodayPanel, WorkspaceShell } from '../components/Workspace'
import { formatCompactDate, formatCompactDateRange, formatCompactDateTime, formatCompactTimeRange, formatDateET, formatDateTimeET } from '../utils/dateTime'
import { formatClinicalRole } from '../utils/display'
import type { AdminApplication, AdminComplianceDocument, AdminUser } from '../types'

type AdminTab = 'overview' | 'accounts' | 'credentials' | 'applications' | 'attendance'

const adminTabs: Array<{ id: AdminTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'accounts', label: 'Account Review' },
  { id: 'credentials', label: 'Credential Review' },
  { id: 'applications', label: 'Application Review' },
  { id: 'attendance', label: 'Attendance' },
]

function formatDate(value?: string | null) {
  return value ? formatDateET(value) : 'No expiry date'
}

function formatDocumentType(value: string) {
  const labels: Record<string, string> = {
    license: 'Nursing License',
    certification: 'CPR / First Aid',
    background_check: 'Vulnerable Sector Check',
    vaccination: 'Immunization Record',
    other: 'Government ID',
  }

  return labels[value] || value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}

function getAccountRequestTitle(role: string) {
  switch (role) {
    case 'nurse':
      return 'Nurse account request'
    case 'facility':
      return 'Healthcare organization account request'
    case 'admin':
      return 'Admin account request'
    default:
      return 'Account request'
  }
}

function cleanDisplayName(value: string | null | undefined, fallback: string) {
  const text = (value || '').trim()
  if (!text || /phase|demo|test|string|mock|placeholder/i.test(text)) {
    return fallback
  }
  return text
}

function formatApplicationReviewLabel(status: string) {
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

function getCoverageLabel(status: string) {
  if (['approved', 'confirmed', 'completed'].includes(status)) return 'Confirmed'
  if (status === 'rejected') return 'Not selected'
  if (status === 'withdrawn') return 'Withdrawn'
  return 'Awaiting'
}

function getCoverageChipLabel(status: string) {
  if (['approved', 'confirmed', 'completed'].includes(status)) return 'Confirmed'
  if (status === 'rejected') return 'Not selected'
  if (status === 'withdrawn') return 'Withdrawn'
  return 'Awaiting'
}

function getShiftVerificationLabel(status: string) {
  const labels: Record<string, string> = {
    not_started: 'Not started',
    arrival_confirmed: 'Confirmed',
    submitted: 'Submitted',
    verified: 'Verified',
    disputed: 'Disputed',
  }

  return labels[status] || 'Not started'
}

function getCredentialStatus(application: AdminApplication, documents: AdminComplianceDocument[]) {
  const nurseDocuments = documents.filter(document => document.user_id === application.nurse.user_id)
  if (nurseDocuments.some(document => document.status === 'approved')) return { status: 'approved', label: 'Approved' }
  if (nurseDocuments.some(document => document.status === 'pending')) return { status: 'pending', label: 'Pending review' }
  return { status: 'not_started', label: 'Not provided' }
}

function canApproveCredential(document: AdminComplianceDocument) {
  return document.status === 'pending' && document.user_status === 'approved'
}

function effectiveCredentialStatus(document: AdminComplianceDocument) {
  if (document.status === 'approved' && document.user_status !== 'approved') return 'pending'
  return document.status
}

function credentialDependencyMessage(document: AdminComplianceDocument) {
  return document.user_status !== 'approved' ? 'Approve the nurse account before approving credentials.' : ''
}

function formatCredentialStatus(status: string) {
  if (status === 'pending') return 'Pending review'
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  if (status === 'expired') return 'Expired'
  return displayValue(status)
}

function formatAccountStatus(status?: string | null) {
  if (status === 'approved') return 'Approved'
  if (status === 'pending') return 'Pending review'
  if (status === 'rejected') return 'Rejected'
  if (status === 'suspended') return 'Suspended'
  return 'Not provided'
}

function formatReviewOutcome(status: string, reviewedAt?: string | null) {
  if (!reviewedAt && ['pending', 'applied', 'under_review'].includes(status)) return 'Pending review'
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  if (status === 'withdrawn') return 'Withdrawn'
  return formatApplicationReviewLabel(status)
}

function reviewerLabel(value?: string | null, reviewedAt?: string | null) {
  return value || reviewedAt ? 'Administrator' : 'Not reviewed yet'
}

function reviewedDateLabel(value?: string | null) {
  return value ? formatCompactDateTime(value) : 'Not reviewed yet'
}

function verificationStatuses(application: AdminApplication) {
  return {
    arrival: application.shift.arrival_confirmed_at ? { status: 'confirmed', label: 'Confirmed' } : { status: 'not_started', label: 'Not started' },
    completion: application.shift.shift_ended_at ? { status: 'submitted', label: 'Submitted' } : { status: 'not_started', label: 'Not submitted' },
    attendance: application.shift.facility_verified_at || application.shift.timesheet_status === 'verified'
      ? { status: 'verified', label: 'Verified' }
      : { status: 'not_started', label: 'Not verified' },
  }
}

function candidateReadyForApproval(application: AdminApplication, credentialStatus: { status: string; label: string }) {
  return application.nurse.account_status === 'approved' && credentialStatus.status === 'approved'
}

function getAdminFriendlyError(err: unknown, fallback: string) {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { detail?: unknown } } }).response
    const detail = response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
  }
  return fallback
}

function displayValue(value?: string | number | null) {
  if (value === null || value === undefined || String(value).trim() === '') return 'Not provided'
  return String(value)
}

function splitName(value?: string | null) {
  const text = displayValue(value)
  if (text === 'Not provided') return { firstName: 'Not provided', lastName: 'Not provided' }
  const parts = text.trim().split(/\s+/)
  return {
    firstName: parts[0] || 'Not provided',
    lastName: parts.slice(1).join(' ') || 'Not provided',
  }
}

function formatPhone(value?: string | null) {
  const text = displayValue(value)
  if (text === 'Not provided') return text
  const digits = text.replace(/\D/g, '')
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  return text
}

function includesSearch(values: Array<string | number | null | undefined>, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  return values
    .filter(value => value !== null && value !== undefined)
    .some(value => String(value).toLowerCase().includes(normalizedQuery))
}

function formatRoleLabel(role: string) {
  if (role === 'facility') return 'Healthcare Organization'
  if (role === 'nurse') return 'Nurse'
  if (role === 'admin') return 'Admin'
  return role
}

function getAccountDisplayName(account: AdminUser) {
  if (account.role === 'nurse') return cleanDisplayName(account.nurse_full_name, 'Nurse account')
  if (account.role === 'facility') return cleanDisplayName(account.organization_name, 'Healthcare organization')
  return 'Admin account'
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [applications, setApplications] = useState<AdminApplication[]>([])
  const [documents, setDocuments] = useState<AdminComplianceDocument[]>([])
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [expandedApplicationId, setExpandedApplicationId] = useState<string | null>(null)
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null)
  const [expandedDocumentId, setExpandedDocumentId] = useState<string | null>(null)
  const [expandedAttendanceId, setExpandedAttendanceId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [documentActionId, setDocumentActionId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      setMessage(null)
      try {
        const [usersResponse, applicationsResponse, documentsResponse] = await Promise.all([
          apiClient.get<AdminUser[]>(userUrl('/admin/users')),
          apiClient.get<AdminApplication[]>(shiftUrl('/admin/applications')),
          apiClient.get<AdminComplianceDocument[]>(complianceUrl('/admin/documents')),
        ])
        setUsers(usersResponse.data)
        setApplications(applicationsResponse.data)
        setDocuments(documentsResponse.data)
      } catch (err) {
        setError('Unable to load admin review data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user])

  const refreshUsers = async () => {
    const response = await apiClient.get<AdminUser[]>(userUrl('/admin/users'))
    setUsers(response.data)
  }

  const refreshApplications = async () => {
    const response = await apiClient.get<AdminApplication[]>(shiftUrl('/admin/applications'))
    setApplications(response.data)
  }

  const refreshDocuments = async () => {
    const response = await apiClient.get<AdminComplianceDocument[]>(complianceUrl('/admin/documents'))
    setDocuments(response.data)
  }

  const handleUserDecision = async (userId: string, approve: boolean) => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      await apiClient.patch(userUrl(`/admin/users/${userId}/${approve ? 'approve' : 'reject'}`))
      await refreshUsers()
      setMessage(`User ${approve ? 'approved' : 'rejected'} successfully.`)
    } catch {
      setError('Unable to update user status. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleApplicationDecision = async (applicationId: string, approve: boolean) => {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      await apiClient.patch(shiftUrl(`/admin/applications/${applicationId}/${approve ? 'approve' : 'reject'}`))
      await refreshApplications()
      setMessage(`Application ${approve ? 'approved' : 'rejected'} successfully.`)
    } catch (err) {
      setError(getAdminFriendlyError(err, 'Unable to update application status. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentDecision = async (documentId: string, approve: boolean) => {
    setDocumentActionId(documentId)
    setError(null)
    setMessage(null)
    try {
      await apiClient.patch(complianceUrl(`/admin/documents/${documentId}/${approve ? 'approve' : 'reject'}`))
      await refreshDocuments()
      setMessage(`Compliance document ${approve ? 'approved' : 'rejected'} successfully.`)
    } catch (err) {
      setError(getAdminFriendlyError(err, 'Unable to update document status. Please try again.'))
    } finally {
      setDocumentActionId(null)
    }
  }

  const reviewableUsers = users.filter(account => account.role !== 'admin')
  const pendingUserCount = reviewableUsers.filter(account => account.status === 'pending').length
  const approvedUserCount = reviewableUsers.filter(account => account.status === 'approved').length
  const pendingApplicationCount = applications.filter(application => ['applied', 'under_review'].includes(application.status)).length
  const pendingDocumentCount = documents.filter(document => document.status === 'pending').length
  const approvedDocumentCount = documents.filter(document => document.status === 'approved').length
  const rejectedDocumentCount = documents.filter(document => document.status === 'rejected').length
  const submittedShiftRecordCount = applications.filter(application => application.shift.timesheet_status === 'submitted').length
  const verifiedAttendanceCount = applications.filter(application => application.shift.timesheet_status === 'verified').length
  const totalReviewCount = pendingUserCount + pendingDocumentCount + pendingApplicationCount + submittedShiftRecordCount
  const adminStep = pendingUserCount > 0 ? 0 : pendingDocumentCount > 0 ? 1 : pendingApplicationCount > 0 ? 2 : 3
  const adminNextStep = pendingUserCount > 0
    ? { title: 'Review items needing attention', description: 'Account requests, credentials, and applications that need review appear in your operations queue.', actionLabel: 'Open review queue', tab: 'accounts' as AdminTab }
    : pendingDocumentCount > 0
      ? { title: 'Review items needing attention', description: 'Account requests, credentials, and applications that need review appear in your operations queue.', actionLabel: 'Open review queue', tab: 'credentials' as AdminTab }
      : pendingApplicationCount > 0
        ? { title: 'Review items needing attention', description: 'Account requests, credentials, and applications that need review appear in your operations queue.', actionLabel: 'Open review queue', tab: 'applications' as AdminTab }
        : { title: 'Monitor attendance activity', description: submittedShiftRecordCount > 0 ? 'Submitted shift records are ready for review.' : 'Nothing needs attention right now.', actionLabel: 'Open attendance', tab: 'attendance' as AdminTab }
  const sortedDocuments = [...documents].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
  })
  const filteredUsers = reviewableUsers.filter(account => includesSearch([
    getAccountDisplayName(account),
    account.email,
    account.role,
    account.status,
    account.nurse_profession,
    account.nurse_license_number,
    account.nurse_city,
    account.organization_name,
    account.organization_type,
    account.organization_city,
    account.organization_contact_name,
  ], searchQuery))
  const filteredDocuments = sortedDocuments.filter(document => includesSearch([
    document.nurse_full_name,
    document.user_email,
    document.nurse_profession,
    document.nurse_license_number,
    document.nurse_city,
    formatDocumentType(document.document_type),
    document.status,
    document.file_name,
  ], searchQuery))
  const filteredApplications = applications.filter(application => includesSearch([
    application.nurse.full_name,
    application.nurse.email,
    application.nurse.profession,
    application.nurse.license_number,
    application.nurse.city,
    application.facility.organization_name,
    application.facility.facility_type,
    application.facility.city,
    application.shift.role_required,
    application.shift.unit_type,
    application.shift.city,
    application.status,
    application.shift.urgency,
  ], searchQuery))
  const attendanceApplications = applications.filter(application => ['submitted', 'verified', 'disputed'].includes(application.shift.timesheet_status))
  const filteredAttendanceApplications = attendanceApplications.filter(application => includesSearch([
    application.nurse.full_name,
    application.nurse.email,
    application.nurse.profession,
    application.nurse.city,
    application.facility.organization_name,
    application.facility.city,
    application.shift.role_required,
    application.shift.city,
    application.shift.timesheet_status,
  ], searchQuery))
  const activeSearchResultCount = activeTab === 'accounts'
    ? filteredUsers.length
    : activeTab === 'credentials'
      ? filteredDocuments.length
      : activeTab === 'applications'
        ? filteredApplications.length
        : activeTab === 'attendance'
          ? filteredAttendanceApplications.length
          : 0

  return (
    <WorkspaceShell
      title="Operations Dashboard"
      subtitle="Review accounts, credentials, applications, and attendance activity."
      roleLabel="Command center"
      status={<InlineStatus status={user?.status || 'pending'} />}
      primaryAction={<Button onClick={() => setActiveTab(adminNextStep.tab)} size="md">Open review queue</Button>}
      tabs={adminTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      aside={
        <TodayPanel title="Priority queue">
          <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 p-4">
            <p className="text-3xl font-extrabold text-slate-950">{totalReviewCount}</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">items need review</p>
            <Button onClick={() => setActiveTab(adminNextStep.tab)} size="sm" className="mt-4">
              {adminNextStep.actionLabel}
            </Button>
          </div>
          <div className="grid gap-3 text-sm">
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="font-bold text-slate-950">{pendingUserCount} account requests</p>
              <p className="mt-1 text-slate-500">New users waiting for approval.</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="font-bold text-slate-950">{pendingDocumentCount} credentials</p>
              <p className="mt-1 text-slate-500">Documents pending verification.</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="font-bold text-slate-950">{pendingApplicationCount} applications</p>
              <p className="mt-1 text-slate-500">Shift applications awaiting confirmation.</p>
            </div>
          </div>
        </TodayPanel>
      }
    >

        {error && <Alert type="error" message={error} />}
        {message && <Alert type="success" message={message} />}

        {activeTab !== 'overview' && (
          <section className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm shadow-slate-200/70">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <label className="block min-w-0">
                <span className="sr-only">Search review records</span>
                <input
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder="Search by name, email, role, profession, city, or organization"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <div className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-blue-50 px-4 text-sm font-semibold leading-none text-blue-700">
                {searchQuery.trim() ? `${activeSearchResultCount} results` : 'Search current tab'}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'overview' && (
        <PremiumCard
          title="Overview"
          subtitle="Accounts, credentials, applications, and attendance at a glance."
          accent="bg-gradient-to-r from-blue-700 via-cyan-600 to-teal-500"
          className="space-y-6"
        >
          <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-slate-50 to-blue-50 p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <InlineStatus status={user?.status || 'pending'} />
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-600 shadow-sm">
                    Review queue
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-slate-950">Clinical operations command center</h2>
                <p className="mt-2 text-sm text-slate-600">Review pending accounts, credentials, applications, and attendance from one queue.</p>
              </div>
              <Button onClick={() => setActiveTab(adminNextStep.tab)} size="md">
                {adminNextStep.actionLabel}
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryMetric label="Items needing review" value={totalReviewCount} helper="Pending items" icon={<ClinicalIcon name="activity" />} tone={totalReviewCount > 0 ? 'amber' : 'emerald'} />
            <SummaryMetric label="Account review" value={pendingUserCount} helper="Requests" icon={<ClinicalIcon name="nurse" />} tone="blue" />
            <SummaryMetric label="Credential review" value={pendingDocumentCount} helper="Documents" icon={<ClinicalIcon name="shield" />} tone="teal" />
            <SummaryMetric label="Applications" value={pendingApplicationCount} helper="Pending review" icon={<ClinicalIcon name="clipboard" />} tone="emerald" />
            <SummaryMetric label="Attendance" value={submittedShiftRecordCount} helper="Awaiting verification" icon={<ClinicalIcon name="clock" />} tone="amber" />
            <SummaryMetric label="Approved users" value={approvedUserCount} helper="Active accounts" icon={<ClinicalIcon name="building" />} tone="slate" />
          </div>
          <WorkflowStepper steps={['Review accounts', 'Verify credentials', 'Confirm applications', 'Monitor attendance']} currentStep={adminStep} />
          <NextStepCard
            title={adminNextStep.title}
            description={adminNextStep.description}
            actionLabel={adminNextStep.actionLabel}
            onAction={() => setActiveTab(adminNextStep.tab)}
          />
        </PremiumCard>
        )}

        {activeTab === 'credentials' && (
        <PremiumCard
          title="Credential Verification"
          subtitle="Documents pending verification."
          accent="bg-gradient-to-r from-blue-700 via-cyan-600 to-teal-500"
          className="space-y-6"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Credential queue</h2>
              <p className="mt-2 text-slate-600">Licenses and documents awaiting review.</p>
            </div>
            <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">{pendingDocumentCount} pending</span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard title="Pending review" value={pendingDocumentCount} hint="Credential records" icon={<ClinicalIcon name="file" />} />
            <MetricCard title="Approved" value={approvedDocumentCount} hint="Verified credentials" icon={<ClinicalIcon name="shield" />} />
            <MetricCard title="Rejected" value={rejectedDocumentCount} hint="Needs follow-up" icon={<ClinicalIcon name="clipboard" />} />
          </div>

          {loading ? (
            <EmptyState title="Loading credential records" message="Fetching nurse compliance documents." icon={<ClinicalIcon name="file" />} />
          ) : filteredDocuments.length === 0 ? (
            <EmptyState title={searchQuery.trim() ? 'No matching records found' : 'No credentials submitted yet'} message={searchQuery.trim() ? 'Try a different name, email, city, status, or document type.' : 'Nothing needs attention right now.'} icon={<ClinicalIcon name="file" />} />
          ) : (
            <div className="grid gap-4">
              {filteredDocuments.map(document => {
                const isExpanded = expandedDocumentId === document.id
                const displayedDocumentStatus = effectiveCredentialStatus(document)
                const dependencyMessage = credentialDependencyMessage(document)
                const allowApproveDocument = canApproveCredential(document)

                return (
                <div key={document.id} className={`rounded-2xl border p-6 shadow-sm ${document.status === 'pending' ? 'border-blue-100 bg-blue-50/40' : 'border-slate-200 bg-white'}`}>
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-slate-950">{formatDocumentType(document.document_type)}</h3>
                      <p className="mt-2 truncate font-semibold text-slate-900" title={document.file_name}>{document.file_name}</p>
                      <a href={document.file_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center justify-center whitespace-nowrap font-semibold leading-none text-blue-700 hover:text-blue-800">
                        View document
                      </a>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold">
                        <span className="text-slate-500">Credential status</span>
                        <InlineStatus status={displayedDocumentStatus} label={formatCredentialStatus(displayedDocumentStatus)} />
                      </span>
                      {document.reviewed_at && (
                        <span className="inline-flex min-h-[28px] items-center justify-center whitespace-nowrap rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold leading-none text-slate-600 ring-1 ring-slate-100">
                          Reviewed {formatDateTimeET(document.reviewed_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-100 bg-white p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-500">Nurse profile</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{displayValue(document.nurse_full_name)}</p>
                      </div>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold">
                        <span className="text-slate-500">Account status</span>
                        <InlineStatus status={document.user_status || 'pending'} label={formatAccountStatus(document.user_status)} />
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                      <div className="min-w-0 rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-slate-500">Email</p>
                        <p className="mt-2 truncate font-semibold text-slate-900" title={document.user_email}>{document.user_email}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-slate-500">Profession</p>
                        <p className="mt-2 break-words font-semibold text-slate-900" title={displayValue(document.nurse_profession)}>{formatClinicalRole(displayValue(document.nurse_profession))}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-slate-500">License number</p>
                        <p className="mt-2 truncate font-semibold text-slate-900" title={displayValue(document.nurse_license_number)}>{displayValue(document.nurse_license_number)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-slate-500">Experience</p>
                        <p className="mt-2 whitespace-nowrap font-semibold text-slate-900">{document.nurse_years_experience === null || document.nurse_years_experience === undefined ? 'Not provided' : `${document.nurse_years_experience} years`}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-slate-500">City</p>
                        <p className="mt-2 truncate font-semibold text-slate-900" title={displayValue(document.nurse_city)}>{displayValue(document.nurse_city)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-slate-500">Account status</p>
                        <div className="mt-2 flex min-h-[28px] items-center">
                          <InlineStatus status={document.user_status || 'pending'} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-500">Expiry</p>
                      <p className="mt-2 whitespace-nowrap font-semibold text-slate-900">{formatDate(document.expiry_date)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-500">Uploaded</p>
                      <p className="mt-2 whitespace-nowrap font-semibold text-slate-900">{formatDateTimeET(document.uploaded_at)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-500">Credential status</p>
                      <div className="mt-2 flex min-h-[28px] items-center">
                        <InlineStatus status={displayedDocumentStatus} label={formatCredentialStatus(displayedDocumentStatus)} />
                      </div>
                    </div>
                  </div>

                  {dependencyMessage && (
                    <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-800">{dependencyMessage}</p>
                      <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setActiveTab('accounts')}>
                        Go to Account Review
                      </Button>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                      <h4 className="text-sm font-semibold text-slate-950">More details</h4>
                      <div className="mt-4 grid gap-5 lg:grid-cols-2">
                        <div>
                          <h5 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Nurse profile</h5>
                          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                            <p><span className="font-semibold text-slate-500">Full name</span><br /><span className="text-slate-800">{displayValue(document.nurse_full_name)}</span></p>
                            <p className="min-w-0"><span className="font-semibold text-slate-500">Email</span><br /><span className="block truncate text-slate-800" title={document.user_email}>{document.user_email}</span></p>
                            <p><span className="font-semibold text-slate-500">Profession</span><br /><span className="text-slate-800">{formatClinicalRole(displayValue(document.nurse_profession))}</span></p>
                            <p><span className="font-semibold text-slate-500">License number</span><br /><span className="text-slate-800">{displayValue(document.nurse_license_number)}</span></p>
                            <p><span className="font-semibold text-slate-500">Experience</span><br /><span className="text-slate-800">{document.nurse_years_experience === null || document.nurse_years_experience === undefined ? 'Not provided' : `${document.nurse_years_experience} years`}</span></p>
                            <p><span className="font-semibold text-slate-500">City</span><br /><span className="text-slate-800">{displayValue(document.nurse_city)}</span></p>
                            <div><span className="font-semibold text-slate-500">Account status</span><div className="mt-2"><InlineStatus status={document.user_status || 'pending'} label={formatAccountStatus(document.user_status)} /></div></div>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Credential document</h5>
                          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                            <p><span className="font-semibold text-slate-500">Document type</span><br /><span className="text-slate-800">{formatDocumentType(document.document_type)}</span></p>
                            <p className="min-w-0"><span className="font-semibold text-slate-500">File name</span><br /><span className="block truncate text-slate-800" title={document.file_name}>{document.file_name}</span></p>
                            <p><span className="font-semibold text-slate-500">Expiry</span><br /><span className="text-slate-800">{formatDate(document.expiry_date)}</span></p>
                            <p><span className="font-semibold text-slate-500">Uploaded</span><br /><span className="text-slate-800">{formatDateTimeET(document.uploaded_at)}</span></p>
                            <div><span className="font-semibold text-slate-500">Credential status</span><div className="mt-2"><InlineStatus status={displayedDocumentStatus} label={formatCredentialStatus(displayedDocumentStatus)} /></div></div>
                          </div>
                        </div>
                        <div className="lg:col-span-2">
                          <h5 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Review history</h5>
                          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                            <div><span className="font-semibold text-slate-500">Review outcome</span><div className="mt-2"><InlineStatus status={displayedDocumentStatus} label={formatCredentialStatus(displayedDocumentStatus)} /></div></div>
                            <p className="min-w-0"><span className="font-semibold text-slate-500">Reviewed by</span><br /><span className="block truncate text-slate-800" title={document.reviewer_email || ''}>{displayedDocumentStatus === 'pending' ? 'Not reviewed yet' : displayValue(document.reviewer_email || 'Administrator')}</span></p>
                            <p><span className="font-semibold text-slate-500">Reviewed date</span><br /><span className="text-slate-800">{displayedDocumentStatus === 'pending' ? 'Not reviewed yet' : document.reviewed_at ? formatDateTimeET(document.reviewed_at) : 'Not available'}</span></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {document.status === 'pending' && (
                    <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={() => setExpandedDocumentId(isExpanded ? null : document.id)}
                      >
                        {isExpanded ? 'Hide details' : 'More details'}
                      </Button>
                      <Button
                        onClick={() => handleDocumentDecision(document.id, true)}
                        loading={documentActionId === document.id}
                        disabled={documentActionId !== null || !allowApproveDocument}
                        variant="primary"
                        size="md"
                      >
                        Approve document
                      </Button>
                      <Button
                        onClick={() => handleDocumentDecision(document.id, false)}
                        disabled={documentActionId !== null}
                        variant="secondary"
                        size="md"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                      >
                        Reject document
                      </Button>
                    </div>
                  )}
                  {document.status !== 'pending' && (
                    <div className="mt-5 flex justify-end border-t border-slate-100 pt-5">
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={() => setExpandedDocumentId(isExpanded ? null : document.id)}
                      >
                        {isExpanded ? 'Hide details' : 'More details'}
                      </Button>
                    </div>
                  )}
                </div>
                )
              })}
            </div>
          )}
        </PremiumCard>
        )}

        {/* Pending users prioritized */}
        {activeTab === 'accounts' && (
        <section className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Account requests</h2>
              <p className="mt-2 text-slate-600">New users waiting for approval.</p>
            </div>
            <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">{pendingUserCount} pending</span>
          </div>

          {loading ? (
            <EmptyState title="Loading account requests" message="Fetching account requests." />
          ) : filteredUsers.filter(u => u.status === 'pending').length === 0 ? (
            <EmptyState title={searchQuery.trim() ? 'No matching records found' : 'No account requests waiting for review'} message={searchQuery.trim() ? 'Try a different name, email, role, profession, city, or organization.' : 'Nothing needs attention right now.'} icon={<ClinicalIcon name="nurse" />} />
          ) : (
            <div className="mt-6 grid gap-4">
              {filteredUsers.filter(u => u.status === 'pending').map(account => {
                const isExpanded = expandedAccountId === account.id

                return (
                <RecordCard key={account.id} className="border-slate-200 bg-white">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-slate-950">{getAccountRequestTitle(account.role)}</h3>
                      <p className="mt-1 truncate text-sm text-slate-600" title={account.email}>{getAccountDisplayName(account)} / {account.email}</p>
                      <p className="mt-2 text-sm text-slate-500">Created {formatDateTimeET(account.created_at)}</p>
                    </div>
                    <InlineStatus status={account.status} />
                  </div>

                  {isExpanded && (
                    <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                      <h4 className="text-sm font-semibold text-slate-950">More details</h4>
                      <div className="mt-4 grid gap-5 lg:grid-cols-2">
                        <div>
                          <h5 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Account information</h5>
                          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                            <p><span className="font-semibold text-slate-500">Name</span><br /><span className="text-slate-800">{getAccountDisplayName(account)}</span></p>
                            <p className="min-w-0"><span className="font-semibold text-slate-500">Email</span><br /><span className="block truncate text-slate-800" title={account.email}>{account.email}</span></p>
                            <p><span className="font-semibold text-slate-500">Role</span><br /><span className="text-slate-800">{formatRoleLabel(account.role)}</span></p>
                            <p><span className="font-semibold text-slate-500">Created</span><br /><span className="text-slate-800">{formatDateTimeET(account.created_at)}</span></p>
                            <p><span className="font-semibold text-slate-500">Updated</span><br /><span className="text-slate-800">{account.updated_at ? formatDateTimeET(account.updated_at) : 'Not provided'}</span></p>
                            <div><span className="font-semibold text-slate-500">Status</span><div className="mt-2"><InlineStatus status={account.status} /></div></div>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{account.role === 'facility' ? 'Organization profile' : 'Nurse profile'}</h5>
                          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                            {account.role === 'facility' ? (
                              <>
                                <p><span className="font-semibold text-slate-500">Organization</span><br /><span className="text-slate-800">{displayValue(account.organization_name)}</span></p>
                                <p><span className="font-semibold text-slate-500">Care setting</span><br /><span className="text-slate-800">{displayValue(account.organization_type)}</span></p>
                                <p><span className="font-semibold text-slate-500">Primary contact</span><br /><span className="text-slate-800">{displayValue(account.organization_contact_name)}</span></p>
                                <p><span className="font-semibold text-slate-500">Phone number</span><br /><span className="text-slate-800">{formatPhone(account.organization_phone)}</span></p>
                                <p><span className="font-semibold text-slate-500">Street address</span><br /><span className="text-slate-800">{displayValue(account.organization_street_address || account.organization_address)}</span></p>
                                <p><span className="font-semibold text-slate-500">City</span><br /><span className="text-slate-800">{displayValue(account.organization_city)}</span></p>
                                <p><span className="font-semibold text-slate-500">Province</span><br /><span className="text-slate-800">{displayValue(account.organization_province)}</span></p>
                                <p><span className="font-semibold text-slate-500">Postal code</span><br /><span className="text-slate-800">{displayValue(account.organization_postal_code)}</span></p>
                              </>
                            ) : (
                              <>
                                <p><span className="font-semibold text-slate-500">Full name</span><br /><span className="text-slate-800">{displayValue(account.nurse_full_name)}</span></p>
                                <p><span className="font-semibold text-slate-500">Phone number</span><br /><span className="text-slate-800">{formatPhone(account.nurse_phone)}</span></p>
                                <p><span className="font-semibold text-slate-500">Profession</span><br /><span className="text-slate-800">{formatClinicalRole(displayValue(account.nurse_profession))}</span></p>
                                <p><span className="font-semibold text-slate-500">License number</span><br /><span className="text-slate-800">{displayValue(account.nurse_license_number)}</span></p>
                                <p><span className="font-semibold text-slate-500">Experience</span><br /><span className="text-slate-800">{account.nurse_years_experience === null || account.nurse_years_experience === undefined ? 'Not provided' : `${account.nurse_years_experience} years`}</span></p>
                                <p><span className="font-semibold text-slate-500">City</span><br /><span className="text-slate-800">{displayValue(account.nurse_city)}</span></p>
                                <div><span className="font-semibold text-slate-500">Availability</span><div className="mt-2"><InlineStatus status={account.nurse_availability_status || 'not_started'} /></div></div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                      <Button type="button" onClick={() => setExpandedAccountId(isExpanded ? null : account.id)} variant="secondary" size="md">{isExpanded ? 'Hide details' : 'More details'}</Button>
                      <Button onClick={() => handleUserDecision(account.id, true)} variant="primary" size="md">Approve</Button>
                      <Button
                        onClick={() => handleUserDecision(account.id, false)}
                        variant="secondary"
                        size="md"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                      >
                        Reject
                      </Button>
                  </div>
                </RecordCard>
                )
              })}
            </div>
          )}
        </section>
        )}

        {activeTab === 'accounts' && (
        <section className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Reviewed accounts</h2>
              <p className="mt-2 text-slate-600">Accounts that have completed review.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">{users.filter(u => u.status !== 'pending').length} users</span>
          </div>

          {loading ? (
            <EmptyState title="Loading users" message="Fetching account records." />
          ) : filteredUsers.filter(u => u.status !== 'pending').length === 0 ? (
            <EmptyState title={searchQuery.trim() ? 'No matching records found' : 'No reviewed accounts yet'} message={searchQuery.trim() ? 'Try a different name, email, role, profession, city, or organization.' : 'Approved and rejected accounts will appear here after review.'} icon={<ClinicalIcon name="building" />} />
          ) : (
            <div className="mt-6 grid gap-4">
              {filteredUsers.filter(u => u.status !== 'pending').map(account => {
                const isExpanded = expandedAccountId === account.id

                return (
                  <RecordCard key={account.id} className="border-slate-100 bg-white">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-slate-950">{getAccountDisplayName(account)}</h3>
                        <p className="mt-1 truncate text-sm text-slate-600" title={account.email}>{formatRoleLabel(account.role)} / {account.email}</p>
                        <p className="mt-2 text-sm text-slate-500">Created {formatDateTimeET(account.created_at)}</p>
                      </div>
                      <InlineStatus status={account.status} />
                    </div>

                    {isExpanded && (
                      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                        <h4 className="text-sm font-semibold text-slate-950">More details</h4>
                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                          <p><span className="font-semibold text-slate-500">Name</span><br /><span className="text-slate-800">{getAccountDisplayName(account)}</span></p>
                          <p className="min-w-0"><span className="font-semibold text-slate-500">Email</span><br /><span className="block truncate text-slate-800" title={account.email}>{account.email}</span></p>
                          <p><span className="font-semibold text-slate-500">Role</span><br /><span className="text-slate-800">{formatRoleLabel(account.role)}</span></p>
                          <p><span className="font-semibold text-slate-500">Created</span><br /><span className="text-slate-800">{formatDateTimeET(account.created_at)}</span></p>
                          <p><span className="font-semibold text-slate-500">Updated</span><br /><span className="text-slate-800">{account.updated_at ? formatDateTimeET(account.updated_at) : 'Not provided'}</span></p>
                          <p><span className="font-semibold text-slate-500">City</span><br /><span className="text-slate-800">{displayValue(account.nurse_city || account.organization_city)}</span></p>
                          <p><span className="font-semibold text-slate-500">Profession / setting</span><br /><span className="text-slate-800">{displayValue(account.nurse_profession || account.organization_type)}</span></p>
                          <p><span className="font-semibold text-slate-500">Phone number</span><br /><span className="text-slate-800">{formatPhone(account.organization_phone)}</span></p>
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex justify-end border-t border-slate-100 pt-5">
                      <Button type="button" variant="secondary" size="md" onClick={() => setExpandedAccountId(isExpanded ? null : account.id)}>
                        {isExpanded ? 'Hide details' : 'More details'}
                      </Button>
                    </div>
                  </RecordCard>
                )
              })}
            </div>
          )}
        </section>
        )}

        {activeTab === 'applications' && (
        <section className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Application review</h2>
              <p className="mt-2 text-slate-600">Review candidate context, credentials, and pay estimates before confirming coverage.</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">All times shown in Eastern Time.</p>
            </div>
            <span className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-blue-50 px-4 text-sm font-semibold leading-none text-blue-700">
              {pendingApplicationCount > 0 ? `${pendingApplicationCount} pending reviews` : `${applications.length} applications`}
            </span>
          </div>

          {loading ? (
            <EmptyState title="Loading applications" message="Fetching shift applications." />
          ) : filteredApplications.length === 0 ? (
            <EmptyState title={searchQuery.trim() ? 'No matching records found' : 'No applications waiting for review'} message={searchQuery.trim() ? 'Try a different candidate, organization, city, role, or status.' : 'Nothing needs attention right now.'} icon={<ClinicalIcon name="clipboard" />} />
          ) : (
            <div className="mt-6 grid gap-4">
              {filteredApplications.map(application => {
                const nurseName = cleanDisplayName(application.nurse.full_name, 'Nurse profile')
                const organizationName = cleanDisplayName(application.facility.organization_name, 'Healthcare organization')
                const isReviewable = ['applied', 'under_review'].includes(application.status)
                const isExpanded = expandedApplicationId === application.id
                const candidateName = splitName(application.nurse.full_name)
                const credentialStatus = getCredentialStatus(application, documents)
                const verification = verificationStatuses(application)
                const readyForApproval = candidateReadyForApproval(application, credentialStatus)

                return (
                  <RecordCard
                    key={application.id}
                    className={isReviewable ? 'border-blue-100 bg-white' : 'border-slate-100 bg-slate-50/80'}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                          {formatClinicalRole(application.shift.role_required)} application
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {nurseName} / {organizationName} / {application.shift.unit_type}
                        </p>
                      </div>
                      <InlineStatus status={application.status} label={formatApplicationReviewLabel(application.status)} />
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <span className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-slate-50 px-3 text-xs font-semibold leading-none text-slate-600 ring-1 ring-slate-100">
                        Submitted {formatCompactDateTime(application.applied_at)}
                      </span>
                      <span className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-slate-50 px-3 text-xs font-semibold leading-none text-slate-600 ring-1 ring-slate-100">
                        {application.nurse.city || application.shift.city}
                      </span>
                      <span className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-slate-50 px-3 text-xs font-semibold leading-none text-slate-600 ring-1 ring-slate-100">
                        {application.nurse.years_experience} years experience
                      </span>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold">
                        <span className="text-slate-500">Credentials:</span>
                        <InlineStatus status={credentialStatus.status} label={credentialStatus.label} />
                      </span>
                    </div>

                    {!readyForApproval && isReviewable && (
                      <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-800">
                          Candidate account and credentials must be approved before confirming coverage.
                        </p>
                      </div>
                    )}

                    <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-2">
                      <div className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                        <h4 className="text-sm font-semibold text-slate-950">Review details</h4>
                        <div className="mt-4 grid gap-3 text-sm">
                          <div className="grid gap-1 sm:grid-cols-[130px_minmax(0,1fr)]">
                            <span className="font-semibold text-slate-500">Candidate</span>
                            <span className="min-w-0 break-words font-semibold text-slate-900">{nurseName}</span>
                          </div>
                          <div className="grid gap-1 sm:grid-cols-[130px_minmax(0,1fr)]">
                            <span className="font-semibold text-slate-500">Profession</span>
                            <span className="min-w-0 break-words text-slate-700">{formatClinicalRole(application.nurse.profession)}</span>
                          </div>
                          <div className="grid gap-1 sm:grid-cols-[130px_minmax(0,1fr)]">
                            <span className="font-semibold text-slate-500">Organization</span>
                            <span className="min-w-0 break-words text-slate-700">{organizationName}</span>
                          </div>
                          <div className="grid gap-1 sm:grid-cols-[130px_minmax(0,1fr)]">
                            <span className="font-semibold text-slate-500">Care setting</span>
                            <span className="min-w-0 break-words text-slate-700">{application.shift.unit_type}</span>
                          </div>
                          <div className="grid gap-1 sm:grid-cols-[130px_minmax(0,1fr)]">
                            <span className="font-semibold text-slate-500">Date</span>
                            <span className="min-w-0 text-slate-700">{formatCompactDate(application.shift.start_time)}</span>
                          </div>
                          <div className="grid gap-1 sm:grid-cols-[130px_minmax(0,1fr)]">
                            <span className="font-semibold text-slate-500">Time</span>
                            <span className="min-w-0 text-slate-700">{formatCompactTimeRange(application.shift.start_time, application.shift.end_time)}</span>
                          </div>
                          <div className="grid gap-1 sm:grid-cols-[130px_minmax(0,1fr)] sm:items-center">
                            <span className="font-semibold text-slate-500">Coverage</span>
                            <InlineStatus status={application.status === 'applied' || application.status === 'under_review' ? 'awaiting' : application.status} label={getCoverageChipLabel(application.status)} />
                          </div>
                        </div>
                      </div>

                      <PayPanel
                        hourly={application.shift.estimated_hourly_rate}
                        total={application.shift.estimated_total_pay}
                        breakdown={application.shift.pricing_breakdown}
                        compact
                      />
                    </div>

                    {isExpanded && (
                      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                        <h4 className="text-sm font-semibold text-slate-950">More details</h4>
                        <div className="mt-4 grid gap-5 text-sm xl:grid-cols-2">
                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                            <h5 className="font-semibold text-slate-950">Candidate details</h5>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <p><span className="font-semibold text-slate-500">First name</span><br /><span className="text-slate-800">{candidateName.firstName}</span></p>
                              <p><span className="font-semibold text-slate-500">Last name</span><br /><span className="text-slate-800">{candidateName.lastName}</span></p>
                              <p><span className="font-semibold text-slate-500">Full name</span><br /><span className="text-slate-800">{nurseName}</span></p>
                              <p className="min-w-0"><span className="font-semibold text-slate-500">Email</span><br /><span className="block truncate text-slate-800" title={application.nurse.email || ''}>{displayValue(application.nurse.email)}</span></p>
                              <p><span className="font-semibold text-slate-500">Phone number</span><br /><span className="text-slate-800">{formatPhone(application.nurse.phone)}</span></p>
                              <p><span className="font-semibold text-slate-500">Profession</span><br /><span className="text-slate-800">{formatClinicalRole(application.nurse.profession)}</span></p>
                              <p><span className="font-semibold text-slate-500">License number</span><br /><span className="text-slate-800">{displayValue(application.nurse.license_number)}</span></p>
                              <p><span className="font-semibold text-slate-500">Years of experience</span><br /><span className="text-slate-800">{application.nurse.years_experience === null || application.nurse.years_experience === undefined ? 'Not provided' : `${application.nurse.years_experience} years`}</span></p>
                              <p><span className="font-semibold text-slate-500">City</span><br /><span className="text-slate-800">{displayValue(application.nurse.city)}</span></p>
                              <div><span className="font-semibold text-slate-500">Availability</span><div className="mt-2"><InlineStatus status={application.nurse.availability_status || 'not_started'} /></div></div>
                              <div><span className="font-semibold text-slate-500">Account status</span><div className="mt-2"><InlineStatus status={application.nurse.account_status || 'pending'} label={formatAccountStatus(application.nurse.account_status)} /></div></div>
                              <div className="min-w-0"><span className="font-semibold text-slate-500">Credentials</span><div className="mt-2 min-w-0"><InlineStatus status={credentialStatus.status} label={credentialStatus.label} /></div></div>
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                            <h5 className="font-semibold text-slate-950">Organization details</h5>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <p><span className="font-semibold text-slate-500">Organization name</span><br /><span className="text-slate-800">{organizationName}</span></p>
                              <p><span className="font-semibold text-slate-500">Care setting</span><br /><span className="text-slate-800">{displayValue(application.facility.facility_type)}</span></p>
                              <p><span className="font-semibold text-slate-500">Primary contact</span><br /><span className="text-slate-800">{displayValue(application.facility.contact_name)}</span></p>
                              <p><span className="font-semibold text-slate-500">Phone number</span><br /><span className="text-slate-800">{formatPhone(application.facility.phone)}</span></p>
                              <p><span className="font-semibold text-slate-500">Street address</span><br /><span className="text-slate-800">{displayValue(application.facility.address)}</span></p>
                              <p><span className="font-semibold text-slate-500">City</span><br /><span className="text-slate-800">{displayValue(application.facility.city)}</span></p>
                              <p><span className="font-semibold text-slate-500">Province</span><br /><span className="text-slate-800">{displayValue(application.facility.province)}</span></p>
                              <p><span className="font-semibold text-slate-500">Postal code</span><br /><span className="text-slate-800">{displayValue(application.facility.postal_code)}</span></p>
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                            <h5 className="font-semibold text-slate-950">Staffing request details</h5>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <p><span className="font-semibold text-slate-500">Clinical role</span><br /><span className="text-slate-800">{formatClinicalRole(application.shift.role_required)}</span></p>
                              <p><span className="font-semibold text-slate-500">Care setting</span><br /><span className="text-slate-800">{displayValue(application.shift.unit_type)}</span></p>
                              <p><span className="font-semibold text-slate-500">City</span><br /><span className="text-slate-800">{displayValue(application.shift.city)}</span></p>
                              <p><span className="font-semibold text-slate-500">Date</span><br /><span className="text-slate-800">{formatCompactDate(application.shift.start_time)}</span></p>
                              <p><span className="font-semibold text-slate-500">Start time</span><br /><span className="text-slate-800">{formatCompactTimeRange(application.shift.start_time, application.shift.start_time).split(' - ')[0]}</span></p>
                              <p><span className="font-semibold text-slate-500">End time</span><br /><span className="text-slate-800">{formatCompactTimeRange(application.shift.end_time, application.shift.end_time).split(' - ')[0]}</span></p>
                              <p><span className="font-semibold text-slate-500">Credential requirements</span><br /><span className="text-slate-800">{displayValue(application.shift.required_credentials)}</span></p>
                              <div><span className="font-semibold text-slate-500">Urgency</span><div className="mt-2"><InlineStatus status={application.shift.urgency || 'normal'} /></div></div>
                              <p><span className="font-semibold text-slate-500">Notes</span><br /><span className="text-slate-800">{displayValue(application.shift.notes)}</span></p>
                              <div className="min-w-0"><span className="font-semibold text-slate-500">Coverage</span><div className="mt-2 min-w-0"><InlineStatus status={application.status === 'applied' || application.status === 'under_review' ? 'awaiting' : application.status} label={getCoverageLabel(application.status)} /></div></div>
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                            <h5 className="font-semibold text-slate-950">Application details</h5>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <p><span className="font-semibold text-slate-500">Submitted</span><br /><span className="text-slate-800">{formatCompactDateTime(application.applied_at)}</span></p>
                              <div className="min-w-0"><span className="font-semibold text-slate-500">Application status</span><div className="mt-2 min-w-0"><InlineStatus status={application.status} label={formatApplicationReviewLabel(application.status)} /></div></div>
                              <p><span className="font-semibold text-slate-500">Match reason</span><br /><span className="text-slate-800">Not provided</span></p>
                              <div className="min-w-0"><span className="font-semibold text-slate-500">Review outcome</span><div className="mt-2 min-w-0"><InlineStatus status={application.reviewed_at ? application.status : 'pending'} label={formatReviewOutcome(application.status, application.reviewed_at)} /></div></div>
                              <p><span className="font-semibold text-slate-500">Reviewed by</span><br /><span className="text-slate-800">{reviewerLabel(application.reviewed_by, application.reviewed_at)}</span></p>
                              <p><span className="font-semibold text-slate-500">Reviewed date</span><br /><span className="text-slate-800">{reviewedDateLabel(application.reviewed_at)}</span></p>
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                            <h5 className="font-semibold text-slate-950">Estimated nurse pay</h5>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <p><span className="font-semibold text-slate-500">Hourly</span><br /><span className="text-slate-800">{application.shift.estimated_hourly_rate === null || application.shift.estimated_hourly_rate === undefined ? 'Not provided' : `$${application.shift.estimated_hourly_rate}`}</span></p>
                              <p><span className="font-semibold text-slate-500">Shift total</span><br /><span className="text-slate-800">{application.shift.estimated_total_pay === null || application.shift.estimated_total_pay === undefined ? 'Not provided' : `$${application.shift.estimated_total_pay}`}</span></p>
                              <p><span className="font-semibold text-slate-500">Base</span><br /><span className="text-slate-800">{application.shift.pricing_breakdown ? `$${application.shift.pricing_breakdown.base_rate}` : 'Not provided'}</span></p>
                              <p><span className="font-semibold text-slate-500">Urgency</span><br /><span className="text-slate-800">{application.shift.pricing_breakdown ? `$${application.shift.pricing_breakdown.urgency_bonus}` : 'Not provided'}</span></p>
                              <p><span className="font-semibold text-slate-500">Experience</span><br /><span className="text-slate-800">{application.shift.pricing_breakdown ? `$${application.shift.pricing_breakdown.experience_premium}` : 'Not provided'}</span></p>
                              <p><span className="font-semibold text-slate-500">Hours</span><br /><span className="text-slate-800">{application.shift.pricing_breakdown ? application.shift.pricing_breakdown.shift_hours : 'Not provided'}</span></p>
                            </div>
                          </div>

                          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                            <h5 className="font-semibold text-slate-950">Verification</h5>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <div className="min-w-0"><span className="font-semibold text-slate-500">Arrival</span><div className="mt-2 min-w-0"><InlineStatus status={verification.arrival.status} label={verification.arrival.label} /></div></div>
                              <div className="min-w-0"><span className="font-semibold text-slate-500">Completion</span><div className="mt-2 min-w-0"><InlineStatus status={verification.completion.status} label={verification.completion.label} /></div></div>
                              <div className="min-w-0"><span className="font-semibold text-slate-500">Attendance</span><div className="mt-2 min-w-0"><InlineStatus status={verification.attendance.status} label={verification.attendance.label} /></div></div>
                              <p><span className="font-semibold text-slate-500">Verified date</span><br /><span className="text-slate-800">{application.shift.facility_verified_at ? formatCompactDateTime(application.shift.facility_verified_at) : 'Not provided'}</span></p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        <InlineStatus status={application.shift.timesheet_status || 'not_started'} label={application.shift.timesheet_status === 'not_started' ? 'Not started' : getShiftVerificationLabel(application.shift.timesheet_status || 'not_started')} />
                        <button
                          type="button"
                          onClick={() => setExpandedApplicationId(isExpanded ? null : application.id)}
                          className="inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full px-3 text-xs font-semibold leading-none text-blue-700 transition hover:bg-blue-50"
                        >
                          {isExpanded ? 'Hide details' : 'More details'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-3 sm:justify-end">
                        {isReviewable && (
                          <>
                          <Button onClick={() => handleApplicationDecision(application.id, true)} variant="primary" size="md" disabled={!readyForApproval}>
                            Approve application
                          </Button>
                          <Button
                            onClick={() => handleApplicationDecision(application.id, false)}
                            variant="secondary"
                            size="md"
                            className="border-red-200 text-red-700 hover:bg-red-50"
                          >
                            Reject
                          </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </RecordCard>
                )
              })}
            </div>
          )}
        </section>
        )}

        {activeTab === 'attendance' && (
        <section className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Attendance</h2>
              <p className="mt-2 text-slate-600">Track submitted shift records and verified attendance.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">{submittedShiftRecordCount} pending verification</span>
              <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">{verifiedAttendanceCount} verified attendance</span>
            </div>
          </div>

          {filteredAttendanceApplications.length === 0 ? (
            <div className="mt-6">
              <EmptyState title={searchQuery.trim() ? 'No matching records found' : 'No attendance records yet'} message={searchQuery.trim() ? 'Try a different nurse, organization, role, city, or status.' : 'Submitted shift records will appear here.'} icon={<ClinicalIcon name="clock" />} />
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {filteredAttendanceApplications
                .map(application => {
                  const isExpanded = expandedAttendanceId === application.id

                  return (
                  <DataCard
                    key={application.id}
                    title="Attendance record"
                    subtitle={`${formatClinicalRole(application.shift.role_required)} at ${cleanDisplayName(application.facility.organization_name, 'Healthcare organization')}`}
                    meta={<InlineStatus status={application.shift.timesheet_status} />}
                  >
                    <div className="grid gap-4 text-sm text-slate-600 md:grid-cols-4">
                      <div>
                        <p className="font-semibold text-slate-900">Healthcare organization</p>
                        <p className="mt-1">{cleanDisplayName(application.facility.organization_name, 'Healthcare organization')}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Nurse</p>
                        <p className="mt-1">{cleanDisplayName(application.nurse.full_name, 'Nurse profile')}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Shift</p>
                        <p className="mt-1">{formatDateTimeET(application.shift.start_time)}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Status</p>
                        <div className="mt-1"><InlineStatus status={application.shift.timesheet_status} /></div>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Verified date</p>
                        <p className="mt-1">{application.shift.facility_verified_at ? formatDateTimeET(application.shift.facility_verified_at) : 'Pending verification'}</p>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                        <h4 className="text-sm font-semibold text-slate-950">More details</h4>
                        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                          <p><span className="font-semibold text-slate-500">Candidate</span><br /><span className="text-slate-800">{cleanDisplayName(application.nurse.full_name, 'Nurse profile')}</span></p>
                          <p className="min-w-0"><span className="font-semibold text-slate-500">Email</span><br /><span className="block truncate text-slate-800" title={application.nurse.email || ''}>{displayValue(application.nurse.email)}</span></p>
                          <p><span className="font-semibold text-slate-500">Profession</span><br /><span className="text-slate-800">{formatClinicalRole(application.nurse.profession)}</span></p>
                          <p><span className="font-semibold text-slate-500">Organization</span><br /><span className="text-slate-800">{cleanDisplayName(application.facility.organization_name, 'Healthcare organization')}</span></p>
                          <p><span className="font-semibold text-slate-500">Schedule</span><br /><span className="text-slate-800">{formatCompactDateRange(application.shift.start_time, application.shift.end_time)}</span></p>
                          <div><span className="font-semibold text-slate-500">Verification status</span><div className="mt-2"><InlineStatus status={application.shift.timesheet_status} label={getShiftVerificationLabel(application.shift.timesheet_status)} /></div></div>
                          <p><span className="font-semibold text-slate-500">Arrival confirmed</span><br /><span className="text-slate-800">{application.shift.arrival_confirmed_at ? formatCompactDateTime(application.shift.arrival_confirmed_at) : 'Not provided'}</span></p>
                          <p><span className="font-semibold text-slate-500">Shift completion</span><br /><span className="text-slate-800">{application.shift.shift_ended_at ? formatCompactDateTime(application.shift.shift_ended_at) : 'Not provided'}</span></p>
                        </div>
                      </div>
                    )}
                    <div className="mt-5 flex justify-end border-t border-slate-100 pt-5">
                      <Button type="button" variant="secondary" size="md" onClick={() => setExpandedAttendanceId(isExpanded ? null : application.id)}>
                        {isExpanded ? 'Hide details' : 'More details'}
                      </Button>
                    </div>
                  </DataCard>
                  )
                })}
            </div>
          )}
        </section>
        )}
    </WorkspaceShell>
  )
}

