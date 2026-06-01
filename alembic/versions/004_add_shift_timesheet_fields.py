"""Add shift timesheet verification fields

Revision ID: 004_add_shift_timesheet_fields
Revises: 003_add_document_file_name
Create Date: 2026-05-30 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "004_add_shift_timesheet_fields"
down_revision = "003_add_document_file_name"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("shifts", sa.Column("arrival_confirmed_at", sa.DateTime(), nullable=True))
    op.add_column("shifts", sa.Column("shift_ended_at", sa.DateTime(), nullable=True))
    op.add_column("shifts", sa.Column("facility_verified_at", sa.DateTime(), nullable=True))
    op.add_column(
        "shifts",
        sa.Column("timesheet_status", sa.String(length=50), server_default="not_started", nullable=False),
    )
    op.alter_column("shifts", "timesheet_status", server_default=None)


def downgrade() -> None:
    op.drop_column("shifts", "timesheet_status")
    op.drop_column("shifts", "facility_verified_at")
    op.drop_column("shifts", "shift_ended_at")
    op.drop_column("shifts", "arrival_confirmed_at")
