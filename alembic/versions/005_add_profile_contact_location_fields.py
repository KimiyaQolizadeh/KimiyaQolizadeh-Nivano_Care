"""add profile contact and location fields

Revision ID: 006_profile_contact_location
Revises: 005_withdrawn_status
Create Date: 2026-05-31
"""

from alembic import op
import sqlalchemy as sa


revision = "006_profile_contact_location"
down_revision = "005_withdrawn_status"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("nurse_profiles", sa.Column("phone", sa.String(length=20), nullable=True))
    op.add_column("facility_profiles", sa.Column("street_address", sa.String(length=255), nullable=True))
    op.add_column("facility_profiles", sa.Column("province", sa.String(length=64), nullable=True))
    op.add_column("facility_profiles", sa.Column("postal_code", sa.String(length=16), nullable=True))


def downgrade() -> None:
    op.drop_column("facility_profiles", "postal_code")
    op.drop_column("facility_profiles", "province")
    op.drop_column("facility_profiles", "street_address")
    op.drop_column("nurse_profiles", "phone")
