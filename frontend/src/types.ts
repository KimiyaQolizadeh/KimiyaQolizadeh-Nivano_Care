export type UserRole = 'nurse' | 'facility' | 'admin'
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type ShiftUrgency = 'normal' | 'urgent'
export type ShiftStatus = 'open' | 'under_review' | 'confirmed' | 'completed' | 'cancelled'
export type ApplicationStatus = 'applied' | 'under_review' | 'approved' | 'rejected' | 'withdrawn'
export type AvailabilityStatus = 'available' | 'unavailable' | 'on_shift'
export type DocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired'
export type DocumentType = 'license' | 'certification' | 'vaccination' | 'background_check' | 'other'
export type ShiftVerificationStatus = 'not_started' | 'arrival_confirmed' | 'submitted' | 'verified' | 'disputed'

export interface User {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  created_at: string
  updated_at: string
}

export interface AuthResponse extends User {
  access_token: string
  token_type: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload extends LoginPayload {
  role: UserRole
}

export interface NurseProfile {
  id: string
  user_id: string
  full_name: string
  phone?: string | null
  profession: string
  license_number: string
  years_experience: number
  city: string
  availability_status: AvailabilityStatus
  created_at: string
  updated_at: string
}

export interface NurseProfileCreate {
  full_name: string
  phone?: string | null
  profession: string
  license_number: string
  years_experience: number
  city: string
  availability_status: AvailabilityStatus
}

export interface FacilityProfile {
  id: string
  user_id: string
  organization_name: string
  facility_type: string
  address: string
  street_address?: string | null
  city: string
  province?: string | null
  postal_code?: string | null
  contact_name: string
  phone: string
  created_at: string
  updated_at: string
}

export interface FacilityProfileCreate {
  organization_name: string
  facility_type: string
  address: string
  street_address?: string | null
  city: string
  province?: string | null
  postal_code?: string | null
  contact_name: string
  phone: string
}

export interface Shift {
  id: string
  facility_id: string
  facility_name?: string | null
  confirmed_nurse_name?: string | null
  role_required: string
  unit_type: string
  start_time: string
  end_time: string
  city: string
  required_credentials: string
  urgency: ShiftUrgency
  notes?: string | null
  status: ShiftStatus
  confirmed_nurse_id?: string | null
  arrival_confirmed_at?: string | null
  shift_ended_at?: string | null
  facility_verified_at?: string | null
  timesheet_status: ShiftVerificationStatus
  created_at: string
  updated_at: string
  match_reason?: string | null
  estimated_hourly_rate?: number | null
  estimated_total_pay?: number | null
  pricing_breakdown?: PricingBreakdown | null
}

export interface PricingBreakdown {
  base_rate: number
  urgency_bonus: number
  experience_premium: number
  shift_hours: number
}

export interface ShiftCreate {
  role_required: string
  unit_type: string
  start_time: string
  end_time: string
  city: string
  required_credentials: string
  urgency: ShiftUrgency
  notes?: string
}

export interface Application {
  id: string
  shift_id: string
  nurse_id: string
  status: ApplicationStatus
  applied_at: string
  reviewed_by?: string | null
  reviewed_at?: string | null
}

export interface AdminApplication {
  id: string
  status: ApplicationStatus
  applied_at: string
  reviewed_by?: string | null
  reviewed_at?: string | null
  shift: {
    id: string
    role_required: string
    unit_type: string
    city: string
    required_credentials?: string | null
    urgency?: ShiftUrgency | null
    notes?: string | null
    start_time: string
    end_time: string
    status: ShiftStatus
    timesheet_status: ShiftVerificationStatus
    arrival_confirmed_at?: string | null
    shift_ended_at?: string | null
    facility_verified_at?: string | null
    estimated_hourly_rate?: number | null
    estimated_total_pay?: number | null
    pricing_breakdown?: PricingBreakdown | null
  }
  nurse: {
    id: string
    user_id: string
    full_name: string
    profession: string
    license_number?: string | null
    city: string
    years_experience: number
    email?: string | null
    phone?: string | null
    account_status?: UserStatus | string | null
    availability_status?: AvailabilityStatus | string | null
  }
  facility: {
    id: string
    user_id: string
    organization_name: string
    facility_type?: string | null
    city: string
    contact_name?: string | null
    phone?: string | null
    address?: string | null
    street_address?: string | null
    province?: string | null
    postal_code?: string | null
  }
}

export interface AdminUser {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  created_at: string
  updated_at?: string
  nurse_full_name?: string | null
  nurse_phone?: string | null
  nurse_profession?: string | null
  nurse_license_number?: string | null
  nurse_years_experience?: number | null
  nurse_city?: string | null
  nurse_availability_status?: AvailabilityStatus | string | null
  organization_name?: string | null
  organization_type?: string | null
  organization_address?: string | null
  organization_street_address?: string | null
  organization_city?: string | null
  organization_province?: string | null
  organization_postal_code?: string | null
  organization_contact_name?: string | null
  organization_phone?: string | null
}

export interface ComplianceDocument {
  id: string
  user_id: string
  document_type: DocumentType
  file_name: string
  file_url: string
  status: DocumentStatus
  expiry_date?: string | null
  uploaded_at: string
  reviewed_by?: string | null
  reviewed_at?: string | null
}

export interface ComplianceDocumentCreate {
  document_type: DocumentType
  file_name: string
  file_url: string
  expiry_date: string
}

export interface AdminComplianceDocument extends ComplianceDocument {
  user_email: string
  user_status?: UserStatus | string | null
  nurse_full_name?: string | null
  nurse_profession?: string | null
  nurse_license_number?: string | null
  nurse_years_experience?: number | null
  nurse_city?: string | null
  reviewer_email?: string | null
}
