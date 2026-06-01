# Known Limitations

Nivano Care is an MVP intended for controlled product review and private demo use.

## Staffing Workflow

- Matching is rule-based and simple. It considers role and city context rather than advanced scheduling optimization.
- Application approval is administrator-driven. There is no automated matching engine.
- Shift verification supports arrival confirmation, shift completion submission, and healthcare organization attendance verification.
- A full timesheet is not implemented. There are no break entries, notes, hour adjustments, payroll approvals, invoices, or payment workflows.

## Compliance

- Credential upload supports local document handling for MVP review.
- Credential verification is manual through the admin dashboard.
- Document expiration reminders and automated compliance rules are not implemented.

## Location and Address

- Address fields are structured for the MVP: street address, city, province, postal code.
- Ontario city selection is constrained to common supported cities.
- Address autocomplete, map-based organization selection, and geocoding are future work.
- Geofencing is not implemented.

## Notifications

- Mobile push notifications are not implemented.
- Email/SMS notifications are not implemented.
- Users refresh dashboards or perform actions directly in the web app.

## Admin Access

- Administrator accounts are created internally.
- Public registration supports Nurse and Healthcare Organization accounts only.
- A future super-admin invite flow can replace internal seeding.

## Pricing

- Estimated nurse pay is calculated from base unit rate, urgency, experience premium, and shift duration.
- Payroll, invoicing, taxes, deductions, and payment reconciliation are not implemented.

## Timezone

- User-facing dashboard times are formatted for Eastern Time using `America/Toronto`.
- Cards avoid repeating timezone labels. A dashboard-level note may be used where needed.

## Deployment

- Docker Compose is configured for local/private deployment.
- Secrets should be provided through environment variables before any external deployment.
- The current configuration is not hardened for public internet exposure.
