"""Change nurse_profiles.years_experience from String to Integer

Revision ID: 002_years_experience_int
Revises: 001_initial_schema
Create Date: 2026-05-29 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "002_years_experience_int"
down_revision = "001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "nurse_profiles",
        "years_experience",
        type_=sa.Integer(),
        postgresql_using="years_experience::integer",
        existing_type=sa.String(length=50),
        existing_nullable=False,
        nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "nurse_profiles",
        "years_experience",
        type_=sa.String(length=50),
        postgresql_using="years_experience::text",
        existing_type=sa.Integer(),
        existing_nullable=False,
        nullable=False,
    )
