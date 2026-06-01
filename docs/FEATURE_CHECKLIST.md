# Feature Checklist

## Public Site

- [x] Healthcare SaaS landing page
- [x] Product-tour style sections
- [x] Sign in and create account calls to action
- [x] Healthcare Organization language in user-facing copy
- [x] Role access moved to sign-in flow

## Registration and Authentication

- [x] Public Nurse registration
- [x] Public Healthcare Organization registration
- [x] Admin public registration blocked
- [x] Internally seeded admin account
- [x] Password strength validation
- [x] Email validation
- [x] Role-based dashboard routing after login

## Nurse Portal

- [x] Nurse dashboard overview
- [x] Professional profile management
- [x] Phone number support
- [x] Credential upload
- [x] Credential review status
- [x] Available shifts
- [x] Shift applications
- [x] Application withdrawal before approval
- [x] Shift verification actions
- [x] Eastern Time display

## Healthcare Organization Portal

- [x] Organization dashboard overview
- [x] Organization profile management
- [x] Structured address fields
- [x] Phone number validation
- [x] Ontario city selection
- [x] Staffing request creation
- [x] Shift date validation
- [x] Staffing request cards
- [x] Estimated nurse pay display
- [x] Attendance verification
- [x] Eastern Time display

## Admin Operations

- [x] Operations dashboard overview
- [x] Account Review
- [x] Credential Review
- [x] Credential Review More details
- [x] Application Review
- [x] Application Review More details
- [x] Attendance Review
- [x] Search across review tabs
- [x] Admin accounts excluded from Account Review
- [x] Inline dot status display

## Compliance

- [x] Nurse credential upload
- [x] Admin credential review queue
- [x] Nurse profile context shown in Credential Review
- [x] Approve document
- [x] Reject document

## Shift Lifecycle

- [x] Healthcare Organization posts staffing request
- [x] Nurse applies
- [x] Admin approves application
- [x] Shift becomes confirmed
- [x] Nurse confirms arrival
- [x] Nurse submits shift completion
- [x] Healthcare Organization verifies attendance

## Validation and Data Quality

- [x] Strong password validation
- [x] Email validation
- [x] Phone normalization
- [x] Canadian postal code validation
- [x] Ontario city validation
- [x] Years of experience must be non-negative
- [x] License number required
- [x] Shift start time must be before end time
- [x] Seed data cleanup for old generated records
- [x] Idempotent demo seed script

## Deployment Readiness

- [x] Frontend production build passes
- [x] Docker Compose build passes
- [x] Services start through Docker Compose
- [x] Health endpoints verified
- [x] Migrations run through Docker
- [x] Seed data runs through Docker
- [x] README documents setup, migrations, seed data, credentials, and API docs

## Not Included in MVP

- [ ] Mobile push notifications
- [ ] Geofencing
- [ ] Payroll
- [ ] Invoicing
- [ ] Full timesheets with breaks/notes/hour adjustments
- [ ] Address autocomplete or map integration
- [ ] Super-admin invite flow
