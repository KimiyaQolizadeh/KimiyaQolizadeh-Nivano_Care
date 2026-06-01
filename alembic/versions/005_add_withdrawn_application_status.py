"""Add withdrawn application status

Revision ID: 005_withdrawn_status
Revises: 004_add_shift_timesheet_fields
Create Date: 2026-05-31 00:00:00.000000

"""
from alembic import op


revision = "005_withdrawn_status"
down_revision = "004_add_shift_timesheet_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE shiftapplicationstatus ADD VALUE IF NOT EXISTS 'withdrawn'")


def downgrade() -> None:
    # PostgreSQL enum values cannot be removed safely without recreating the type.
    pass
