# Architecture Overview

Nivano Care is a microservices-based healthcare staffing MVP with a React frontend, FastAPI services, and PostgreSQL.

## Frontend

- React + TypeScript + Vite
- Tailwind CSS
- Role dashboards for Nurse, Healthcare Organization, and Admin
- JWT stored in browser local storage for MVP authentication
- Dates and times are formatted in the frontend using `America/Toronto`

Frontend URL:

- http://localhost:5173

## Backend Services

### Auth Service

Port: `8001`

Responsibilities:

- User registration
- Login
- JWT issuance
- Current user lookup
- Blocks public administrator registration

API docs:

- http://localhost:8001/docs

### User Service

Port: `8002`

Responsibilities:

- Nurse profile management
- Healthcare Organization profile management
- Admin account review data
- Basic profile validation for phone, Ontario city, postal code, license number, and years of experience

API docs:

- http://localhost:8002/docs

### Shift Service

Port: `8003`

Responsibilities:

- Staffing request creation
- Open shift marketplace
- Nurse applications
- Admin application approval/rejection
- Application withdrawal
- Shift verification lifecycle
- Estimated nurse pay calculation

API docs:

- http://localhost:8003/docs

### Compliance Service

Port: `8004`

Responsibilities:

- Credential document upload
- Nurse credential list
- Admin credential review
- Credential approve/reject actions

API docs:

- http://localhost:8004/docs

## Database

- PostgreSQL 15
- Shared SQLAlchemy models in `shared/database/models.py`
- Alembic migrations in `alembic/versions`

Key domain tables:

- `users`
- `nurse_profiles`
- `facility_profiles`
- `documents`
- `shifts`
- `shift_applications`
- `audit_logs`

The backend still uses `facility` naming in API paths and database models for compatibility. User-facing copy uses Healthcare Organization.

Profile and verification notes:

- `nurse_profiles.years_experience` is stored as an integer.
- `nurse_profiles` stores `full_name`; the frontend can collect first and last name and submit the combined value.
- `facility_profiles` stores Healthcare Organization data, including organization name, organization type/care setting, address, street address, city, province, postal code, contact name, and phone.
- `documents` stores credential file metadata, including `file_name` and `file_url`.
- `shifts` stores shift verification timestamps: `arrival_confirmed_at`, `shift_ended_at`, and `facility_verified_at`.
- The backend shift verification status column is named `timesheet_status`; the product UI refers to this as shift verification or attendance verification.
- Estimated nurse pay is computed by the shift service and returned in API responses.

## Validation

- Email format and password strength are validated during registration.
- Public administrator registration is blocked; admin accounts are created internally.
- Phone numbers are validated and normalized.
- Canadian postal codes are validated and normalized.
- Province defaults to Ontario.
- Supported city values are constrained to common Ontario cities.
- Nurse license number is required.
- Years of experience must be greater than or equal to 0.
- Staffing request start time must be before end time.

## Docker

Primary local deployment command:

```bash
docker compose up --build
```

Migration command:

```bash
docker compose run --rm migration-runner alembic upgrade head
```

Seed command:

```bash
docker compose run --rm migration-runner python seed_demo.py
```

## Data Flow

1. Healthcare Organization creates a staffing request.
2. Nurse reviews available shifts and applies.
3. Admin reviews candidate, credential, organization, shift, pricing, and verification context.
4. Admin approves the application.
5. Nurse confirms arrival.
6. Nurse submits shift completion.
7. Healthcare Organization verifies attendance.

## Authentication and Roles

Roles:

- Nurse
- Healthcare Organization
- Admin

Admin accounts are internal only. Public registration supports Nurse and Healthcare Organization accounts.
