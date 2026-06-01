# Database Documentation

## Overview

Nivano Care uses PostgreSQL with SQLAlchemy ORM models and Alembic migrations. The MVP uses one shared database across the FastAPI services.

User-facing product language uses **Healthcare Organization**. The backend keeps the existing `facility` role, API paths, and table names for compatibility.

## Key Files

- `shared/database/models.py` - SQLAlchemy ORM models and enums
- `shared/database/config.py` - database URL configuration
- `shared/database/session.py` - session factory
- `alembic/versions/` - migrations
- `seed_demo.py` - clean, idempotent demo data seed

## Core Tables

### users

Authentication and account status.

- `id` (UUID, primary key)
- `email` (String, unique, indexed)
- `hashed_password` (String)
- `role` (Enum: `nurse`, `facility`, `admin`)
- `status` (Enum: `pending`, `approved`, `rejected`, `suspended`)
- `created_at` (DateTime)
- `updated_at` (DateTime)

Role notes:

- Public registration supports `nurse` and `facility`.
- The UI displays `facility` users as Healthcare Organizations.
- Admin users are created internally, currently through seed data, and are not part of public registration or Account Review.

### nurse_profiles

Professional nurse profile details.

- `id` (UUID, primary key)
- `user_id` (UUID, FK to `users.id`, unique)
- `full_name` (String)
- `phone` (String, nullable)
- `profession` (String)
- `license_number` (String, unique, indexed)
- `years_experience` (Integer)
- `city` (String)
- `availability_status` (Enum: `available`, `unavailable`, `on_shift`)
- `created_at` (DateTime)
- `updated_at` (DateTime)

Name note:

- The current database stores a single `full_name`.
- The frontend can collect first and last name during onboarding, then submit the combined value.

### facility_profiles

Healthcare Organization profile details. The table name remains `facility_profiles` for backend compatibility.

- `id` (UUID, primary key)
- `user_id` (UUID, FK to `users.id`, unique)
- `organization_name` (String)
- `facility_type` (String) - displayed as organization type / care setting
- `address` (String)
- `street_address` (String, nullable)
- `city` (String)
- `province` (String, nullable)
- `postal_code` (String, nullable)
- `contact_name` (String)
- `phone` (String)
- `created_at` (DateTime)
- `updated_at` (DateTime)

Contact note:

- The current database stores one `contact_name`.
- The frontend can collect primary contact first and last name, then submit the combined value.

### documents

Credential and compliance document metadata.

- `id` (UUID, primary key)
- `user_id` (UUID, FK to `users.id`)
- `document_type` (Enum: `license`, `certification`, `vaccination`, `background_check`, `other`)
- `file_name` (String)
- `file_url` (String)
- `status` (Enum: `pending`, `approved`, `rejected`, `expired`)
- `expiry_date` (DateTime, nullable)
- `uploaded_at` (DateTime)
- `reviewed_by` (UUID, FK to `users.id`, nullable)
- `reviewed_at` (DateTime, nullable)

MVP upload behavior:

- Credential upload stores local/file metadata for review.
- Admin Credential Review includes nurse profile context where available.
- Full external document storage, malware scanning, and expiration reminders are future work.

### shifts

Staffing requests posted by Healthcare Organizations.

- `id` (UUID, primary key)
- `facility_id` (UUID, FK to `facility_profiles.id`)
- `role_required` (String)
- `unit_type` (String)
- `start_time` (DateTime)
- `end_time` (DateTime)
- `city` (String)
- `required_credentials` (Text)
- `urgency` (Enum: `normal`, `urgent`)
- `notes` (Text, nullable)
- `status` (Enum: `open`, `under_review`, `confirmed`, `completed`, `cancelled`)
- `confirmed_nurse_id` (UUID, FK to `nurse_profiles.id`, nullable)
- `arrival_confirmed_at` (DateTime, nullable)
- `shift_ended_at` (DateTime, nullable)
- `facility_verified_at` (DateTime, nullable)
- `timesheet_status` (String, default `not_started`)
- `created_at` (DateTime)
- `updated_at` (DateTime)

Shift verification note:

- The product UI describes this as shift verification / attendance verification.
- The backend field is currently named `timesheet_status` for compatibility.
- Expected values are `not_started`, `arrival_confirmed`, `submitted`, `verified`, and `disputed`.
- This is not a full timesheet implementation. Breaks, notes, hour adjustments, payroll, and invoicing are not implemented.

Scheduling and pricing notes:

- `start_time` must be before `end_time`.
- Shift duration must be positive.
- Estimated nurse pay is computed by the shift service and returned in API responses as estimated hourly rate, total pay, and pricing breakdown. It is not stored as dedicated columns on `shifts`.

### shift_applications

Nurse applications for staffing requests.

- `id` (UUID, primary key)
- `shift_id` (UUID, FK to `shifts.id`)
- `nurse_id` (UUID, FK to `nurse_profiles.id`)
- `status` (Enum: `applied`, `under_review`, `approved`, `rejected`, `withdrawn`)
- `applied_at` (DateTime)
- `reviewed_by` (UUID, FK to `users.id`, nullable)
- `reviewed_at` (DateTime, nullable)

Application behavior:

- A nurse can withdraw an application only before approval/confirmation.
- Admin approval sets the selected application to `approved`, assigns the confirmed nurse, and moves the shift to `confirmed`.
- Non-selected applications for the same shift can be rejected as part of the approval flow.

### audit_logs

Audit trail for important actions.

- `id` (UUID, primary key)
- `actor_user_id` (UUID, FK to `users.id`)
- `action` (String)
- `entity_type` (String)
- `entity_id` (UUID)
- `details` (JSON, nullable)
- `created_at` (DateTime)

## Validation Rules

### Auth and Registration

- Email must be valid.
- Password must be at least 8 characters and include uppercase, lowercase, number, and special character.
- Public `admin` registration is blocked with: "Administrator accounts are created internally."

### Nurse Profile

- Phone accepts Canadian/US-style numbers and is normalized for display, for example `416-555-0138`.
- City must be one of the supported Ontario cities.
- `years_experience` must be an integer greater than or equal to 0.
- License number is required and must be non-empty.

### Healthcare Organization Profile

- Phone accepts Canadian/US-style numbers and is normalized for display, for example `416-555-0184`.
- Postal code must be a valid Canadian postal code and is normalized, for example `M5V 2T6`.
- Province defaults to Ontario and must be Ontario when provided.
- City must be one of the supported Ontario cities.
- Address fields are structured for the MVP: street address, city, province, and postal code.

### Staffing Requests

- Role, unit/care setting, city, and required credentials are required.
- `start_time` must be before `end_time`.
- Shift duration must be positive.

Supported Ontario city values include Toronto, Mississauga, Brampton, Vaughan, Markham, Richmond Hill, North York, Scarborough, Etobicoke, Hamilton, Ottawa, London, Kitchener, Waterloo, Windsor, Barrie, and Oshawa.

## Seed Data

`seed_demo.py` creates clean, production-like demo data:

- Admin: `admin@test.com`, approved, internally seeded
- Nurse: Sarah Mitchell, `nurse@test.com`, Registered Nurse (RN), `RN-842913`, 3 years experience, Toronto, available
- Healthcare Organization: Toronto Care Centre, `facility@test.com`, Long-Term Care, Emma Carter, Toronto, Ontario, `M5V 2T6`
- Credential: Nursing License, `Sarah-Mitchell-Nursing-License.pdf`
- Staffing request: Registered Nurse (RN), Long-Term Care, Toronto
- Application: Sarah Mitchell applying to Toronto Care Centre

The seed script is idempotent. It also cleans known old generated records containing labels such as Phase, Demo, Test, string, placeholder, mock, and Dynamic pricing demo.

## Time Display

Database timestamps are stored as DateTime values. The frontend formats user-facing dates and times with `America/Toronto`.

Dashboard cards avoid repeating timezone labels. Documentation and dashboards may include a single note that times are shown in Eastern Time.

## Migrations

Run migrations through Docker:

```bash
docker compose run --rm migration-runner alembic upgrade head
```

Run the seed:

```bash
docker compose run --rm migration-runner python seed_demo.py
```

For a clean local demo reset:

```bash
docker compose down -v
docker compose run --rm migration-runner alembic upgrade head
docker compose run --rm migration-runner python seed_demo.py
docker compose up --build
```

## Backup and Restore

Backup:

```bash
docker exec nivano_postgres pg_dump -U nivano_user -d nivano_db > backup.sql
```

Restore:

```bash
docker exec -i nivano_postgres psql -U nivano_user -d nivano_db < backup.sql
```
