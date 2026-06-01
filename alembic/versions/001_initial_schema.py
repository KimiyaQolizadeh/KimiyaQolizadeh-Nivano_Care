"""Initial migration with all models

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-05-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enums
    userole_enum = postgresql.ENUM("nurse", "facility", "admin", name="userrole", create_type=False)
    userstatus_enum = postgresql.ENUM(
        "pending", "approved", "rejected", "suspended", name="userstatus", create_type=False
    )
    documentstatus_enum = postgresql.ENUM(
        "pending", "approved", "rejected", "expired", name="documentstatus", create_type=False
    )
    shifturgency_enum = postgresql.ENUM("normal", "urgent", name="shifturgency", create_type=False)
    shiftstatus_enum = postgresql.ENUM(
        "open", "under_review", "confirmed", "completed", "cancelled", name="shiftstatus", create_type=False
    )
    shiftapplicationstatus_enum = postgresql.ENUM(
        "applied", "under_review", "approved", "rejected", name="shiftapplicationstatus", create_type=False
    )
    documenttype_enum = postgresql.ENUM(
        "license",
        "certification",
        "vaccination",
        "background_check",
        "other",
        name="documenttype",
        create_type=False,
    )
    availabilitystatus_enum = postgresql.ENUM(
        "available", "unavailable", "on_shift", name="availabilitystatus", create_type=False
    )

    userole_enum.create(op.get_bind(), checkfirst=True)
    userstatus_enum.create(op.get_bind(), checkfirst=True)
    documentstatus_enum.create(op.get_bind(), checkfirst=True)
    shifturgency_enum.create(op.get_bind(), checkfirst=True)
    shiftstatus_enum.create(op.get_bind(), checkfirst=True)
    shiftapplicationstatus_enum.create(op.get_bind(), checkfirst=True)
    documenttype_enum.create(op.get_bind(), checkfirst=True)
    availabilitystatus_enum.create(op.get_bind(), checkfirst=True)

    # Create users table
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", userole_enum, nullable=False),
        sa.Column("status", userstatus_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_user_email"),
        sa.Index("ix_users_email", "email"),
    )

    # Create nurse_profiles table
    op.create_table(
        "nurse_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("profession", sa.String(255), nullable=False),
        sa.Column("license_number", sa.String(255), nullable=False),
        sa.Column("years_experience", sa.String(50), nullable=False),
        sa.Column("city", sa.String(255), nullable=False),
        sa.Column("availability_status", availabilitystatus_enum, nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
        sa.UniqueConstraint("license_number", name="uq_nurse_license_number"),
        sa.Index("ix_nurse_profiles_license_number", "license_number"),
    )

    # Create facility_profiles table
    op.create_table(
        "facility_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_name", sa.String(255), nullable=False),
        sa.Column("facility_type", sa.String(255), nullable=False),
        sa.Column("address", sa.String(500), nullable=False),
        sa.Column("city", sa.String(255), nullable=False),
        sa.Column("contact_name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )

    # Create documents table
    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_type", documenttype_enum, nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("file_url", sa.String(500), nullable=False),
        sa.Column("status", documentstatus_enum, nullable=False),
        sa.Column("expiry_date", sa.DateTime(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(), nullable=False),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create shifts table
    op.create_table(
        "shifts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("facility_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role_required", sa.String(255), nullable=False),
        sa.Column("unit_type", sa.String(255), nullable=False),
        sa.Column("start_time", sa.DateTime(), nullable=False),
        sa.Column("end_time", sa.DateTime(), nullable=False),
        sa.Column("city", sa.String(255), nullable=False),
        sa.Column("required_credentials", sa.Text(), nullable=False),
        sa.Column("urgency", shifturgency_enum, nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", shiftstatus_enum, nullable=False),
        sa.Column("confirmed_nurse_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["confirmed_nurse_id"], ["nurse_profiles.id"]),
        sa.ForeignKeyConstraint(["facility_id"], ["facility_profiles.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create shift_applications table
    op.create_table(
        "shift_applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("shift_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nurse_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", shiftapplicationstatus_enum, nullable=False),
        sa.Column("applied_at", sa.DateTime(), nullable=False),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["nurse_id"], ["nurse_profiles.id"]),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["shift_id"], ["shifts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create audit_logs table
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action", sa.String(255), nullable=False),
        sa.Column("entity_type", sa.String(255), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("details", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table("audit_logs")
    op.drop_table("shift_applications")
    op.drop_table("shifts")
    op.drop_table("documents")
    op.drop_table("facility_profiles")
    op.drop_table("nurse_profiles")
    op.drop_table("users")

    # Drop enums
    op.execute("DROP TYPE IF EXISTS userrole CASCADE")
    op.execute("DROP TYPE IF EXISTS userstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS documentstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS shifturgency CASCADE")
    op.execute("DROP TYPE IF EXISTS shiftstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS shiftapplicationstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS documenttype CASCADE")
    op.execute("DROP TYPE IF EXISTS availabilitystatus CASCADE")
