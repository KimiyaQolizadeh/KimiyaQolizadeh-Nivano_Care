# Nivano Care MVP Demo Flow

This walkthrough shows the core Nivano Care workflow from public entry to administrator review, credential approval, staffing requests, applications, and shift verification.

## Demo URLs

- Frontend: http://localhost:5173
- Auth API docs: http://localhost:8001/docs
- User API docs: http://localhost:8002/docs
- Shift API docs: http://localhost:8003/docs
- Compliance API docs: http://localhost:8004/docs

## Demo Accounts

Administrator access is created internally.

- Admin: `admin@test.com` / `Admin123!`
- Healthcare Organization: `facility@test.com` / `Facility123!`
- Nurse: `nurse@test.com` / `Nurse123!`

## Reset Demo Data

Run migrations and seed clean demo data:

```bash
docker compose run --rm migration-runner alembic upgrade head
docker compose run --rm migration-runner python seed_demo.py
```

For a completely clean local demo database:

```bash
docker compose down -v
docker compose run --rm migration-runner alembic upgrade head
docker compose run --rm migration-runner python seed_demo.py
docker compose up --build
```

## Suggested Demo Script

1. Open the landing page.
   - Show the healthcare staffing positioning and product preview.
   - Screenshot: `docs/screenshots/01-landing-page.png`

2. Open the registration page.
   - Show public registration for Nurse and Healthcare Organization only.
   - Note that administrator access is managed internally.
   - Screenshot: `docs/screenshots/02-register-page.png`

3. Sign in as the nurse.
   - Go to Nurse Dashboard.
   - Show overview metrics, next action, and workflow navigation.
   - Screenshot: `docs/screenshots/03-nurse-dashboard-overview.png`

4. Open Nurse Credentials.
   - Show credential upload/review status and approved document state.
   - Screenshot: `docs/screenshots/04-nurse-credentials.png`

5. Open Nurse Applications.
   - Show application status and withdrawal behavior for pending applications.
   - Screenshot: `docs/screenshots/05-nurse-applications.png`

6. Sign in as the healthcare organization.
   - Show the organization workspace overview.
   - Screenshot: `docs/screenshots/06-healthcare-organization-dashboard-overview.png`

7. Open Staffing Requests.
   - Show the seeded Registered Nurse (RN) request, pay estimate, coverage status, and request details.
   - Screenshot: `docs/screenshots/07-staffing-requests.png`

8. Sign in as admin.
   - Show Operations Dashboard.
   - Screenshot: `docs/screenshots/08-admin-operations-dashboard.png`

9. Open Account Review.
   - Show that admin accounts do not appear in public approval queues.
   - Screenshot: `docs/screenshots/09-account-review.png`

10. Open Credential Review and expand More details.
    - Show nurse profile context beside credential information before approval/rejection.
    - Screenshot: `docs/screenshots/10-credential-review-more-details.png`

11. Open Application Review and expand More details.
    - Show candidate, organization, staffing request, application, pricing, and verification context.
    - Screenshot: `docs/screenshots/11-application-review-more-details.png`

## Shift Verification Flow

After an admin approves an application:

1. The shift becomes confirmed.
2. The nurse confirms arrival.
3. The nurse submits shift completion.
4. The healthcare organization verifies attendance.

This MVP does not implement a full timesheet with breaks, notes, or payroll calculations. The product language uses shift verification and attendance verification.

## Time Display

All user-facing dates and times are formatted for Eastern Time using `America/Toronto`. Dashboard cards do not repeat the `ET` label on every timestamp.
