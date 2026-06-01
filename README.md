# Nivano Care MVP - Healthcare Staffing Coordination

A microservices-based healthcare staffing platform for account review, credential verification, staffing requests, applications, and shift verification.

## Project Structure

```text
nivano-mvp/
|-- frontend/                    # React + Vite + TypeScript frontend
|-- services/
|   |-- auth-service/            # JWT authentication service
|   |-- user-service/            # User management service
|   |-- shift-service/           # Staffing request and shift service
|   `-- compliance-service/      # Credential and compliance service
|-- shared/                      # Shared utilities and models
|-- docs/                        # Demo, architecture, schema, and readiness docs
|-- docker-compose.yml           # Docker Compose configuration
|-- .env.example                 # Environment variables template
`-- README.md
```

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ for frontend development
- Python 3.11+ for backend development

## Quick Start

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Run database migrations:

```bash
docker compose run --rm migration-runner alembic upgrade head
```

3. Seed clean demo data:

```bash
docker compose run --rm migration-runner python seed_demo.py
```

4. Build and start all services:

```bash
docker compose up --build
```

5. Open the app and service docs:

- Frontend: http://localhost:5173
- Auth API docs: http://localhost:8001/docs
- User API docs: http://localhost:8002/docs
- Shift API docs: http://localhost:8003/docs
- Compliance API docs: http://localhost:8004/docs

## Health Checks

Each service exposes `/health`:

```bash
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
curl http://localhost:8004/health
```

## Demo Credentials

The seed script creates internally approved accounts:

- Admin: `admin@test.com` / `Admin123!`
- Healthcare Organization: `facility@test.com` / `Facility123!`
- Nurse: `nurse@test.com` / `Nurse123!`

The admin account is seeded internally and is not part of public registration or Account Review.

## Architecture

### Services

- **Auth Service** (Port 8001): JWT authentication, registration validation, login, and current user lookup.
- **User Service** (Port 8002): Nurse profiles, Healthcare Organization profiles, and admin account review data.
- **Shift Service** (Port 8003): Staffing requests, open shift marketplace, applications, admin approval/rejection, withdrawal, pricing estimates, and shift verification.
- **Compliance Service** (Port 8004): Credential upload, nurse credential lists, admin credential review, and approve/reject actions.

### Database

PostgreSQL 15 is used as the primary database for all services. Shared SQLAlchemy models are in `shared/database/models.py`.

Important naming note:

- User-facing docs and UI use Healthcare Organization.
- Backend roles, routes, and models still use `facility` / `FacilityProfile` for compatibility.

Current core models:

- **User**: core account entity with roles `nurse`, `facility`, and `admin`.
- **NurseProfile**: professional profile with full name, phone, profession, license number, integer years of experience, city, and availability.
- **FacilityProfile**: Healthcare Organization profile with organization name, organization type/care setting, address fields, contact name, phone, city, province, and postal code.
- **Document**: credential document metadata with file name, file URL/path metadata, status, expiry, upload, and review timestamps.
- **Shift**: staffing request and shift verification record, including arrival, shift completion, attendance verification, and backend `timesheet_status`.
- **ShiftApplication**: nurse applications, including withdrawal before approval or confirmation.
- **AuditLog**: action audit trail.

See `docs/DATABASE.md` for full schema details.

## Database Migrations

Run migrations through Docker:

```bash
docker compose run --rm migration-runner alembic upgrade head
```

Run migrations locally:

```bash
pip install -r requirements.txt
alembic upgrade head
```

## Seed Demo Data

Run the seed through Docker:

```bash
docker compose run --rm migration-runner python seed_demo.py
```

Run locally:

```bash
pip install -r requirements.txt
python seed_demo.py
```

`seed_demo.py` is idempotent. It creates clean Sarah Mitchell / Toronto Care Centre demo data and removes known old generated records containing labels such as Phase, Demo, Test, string, placeholder, mock, and Dynamic pricing demo.

For a completely clean local demo database:

```bash
docker compose down -v
docker compose run --rm migration-runner alembic upgrade head
docker compose run --rm migration-runner python seed_demo.py
docker compose up --build
```

## Validation and Product Rules

- Public registration supports Nurse and Healthcare Organization accounts only.
- Administrator accounts are created internally.
- Email format is validated.
- Passwords require at least 8 characters, uppercase, lowercase, number, and special character.
- Phone numbers are validated and normalized to Canadian/US-style display.
- Canadian postal codes are validated and normalized.
- Province defaults to Ontario.
- Ontario city values are constrained to the supported list.
- Nurse license number is required.
- Years of experience must be an integer greater than or equal to 0.
- Staffing request start time must be before end time.

## Product Scope

Included:

- Public landing page and role-based registration
- Nurse dashboard
- Healthcare Organization dashboard
- Admin Operations Dashboard
- Credential upload and review
- Staffing requests and nurse applications
- Application withdrawal before approval
- Admin application approval/rejection
- Shift verification: arrival confirmation, shift completion submission, and attendance verification
- Estimated nurse pay calculation

Not included:

- Full timesheets with breaks, notes, or hour adjustments
- Payroll or invoicing
- Mobile push notifications
- Geofencing
- Address autocomplete, maps, or geocoding
- Super-admin invite flow

## Frontend Development

```bash
cd frontend
npm install
npm run dev
npm run build
```

## Backend Development

Each FastAPI service is located in `services/{service-name}/`.

Example:

```bash
pip install -r requirements.txt
pip install -r services/auth-service/requirements.txt
cd services/auth-service
uvicorn app.main:app --reload --port 8001
```

## Common Docker Commands

```bash
docker compose up
docker compose up -d
docker compose up --build
docker compose down
docker compose logs -f
docker compose logs -f auth-service
```

## Database Access

When services are running via Docker Compose:

```bash
psql -h localhost -U nivano_user -d nivano_db
```

Default local database values are documented in `.env.example`.

## Documentation

- `DEPLOYMENT_ORACLE.md`
- `docs/MVP_DEMO_FLOW.md`
- `docs/KNOWN_LIMITATIONS.md`
- `docs/ARCHITECTURE_OVERVIEW.md`
- `docs/FEATURE_CHECKLIST.md`
- `docs/DATABASE.md`
- `docs/screenshots/`

For Oracle Cloud Ubuntu VM deployment, copy `.env.example.deploy` to `.env`, set the VM public URLs and secrets, then follow `DEPLOYMENT_ORACLE.md`.

## Time Display

User-facing dashboard times are formatted with `America/Toronto`. Cards avoid repeating timezone labels on every timestamp.

## License

Proprietary - All Rights Reserved
