"""Add document file name metadata

Revision ID: 003_add_document_file_name
Revises: 002_years_experience_int
Create Date: 2026-05-30 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "003_add_document_file_name"
down_revision = "002_years_experience_int"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("file_name", sa.String(length=255), nullable=True))
    op.execute("UPDATE documents SET file_name = 'Uploaded document' WHERE file_name IS NULL")
    op.alter_column("documents", "file_name", nullable=False)


def downgrade() -> None:
    op.drop_column("documents", "file_name")
