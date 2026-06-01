import os
from typing import Optional

from dotenv import load_dotenv

load_dotenv()


class DatabaseConfig:
    """Database configuration from environment variables."""

    @staticmethod
    def get_database_url() -> str:
        """Get database URL from environment variables."""
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            return database_url

        db_user = os.getenv("DB_USER", os.getenv("POSTGRES_USER", "nivano_user"))
        db_password = os.getenv("DB_PASSWORD", os.getenv("POSTGRES_PASSWORD", "nivano_password"))
        db_host = os.getenv("DB_HOST", "localhost")
        db_port = os.getenv("DB_PORT", "5432")
        db_name = os.getenv("DB_NAME", os.getenv("POSTGRES_DB", "nivano_db"))

        return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

    @staticmethod
    def get_async_database_url() -> str:
        """Get async database URL from environment variables."""
        async_database_url = os.getenv("ASYNC_DATABASE_URL")
        if async_database_url:
            return async_database_url

        db_user = os.getenv("DB_USER", os.getenv("POSTGRES_USER", "nivano_user"))
        db_password = os.getenv("DB_PASSWORD", os.getenv("POSTGRES_PASSWORD", "nivano_password"))
        db_host = os.getenv("DB_HOST", "localhost")
        db_port = os.getenv("DB_PORT", "5432")
        db_name = os.getenv("DB_NAME", os.getenv("POSTGRES_DB", "nivano_db"))

        return f"postgresql+asyncpg://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"


DATABASE_URL = DatabaseConfig.get_database_url()
ASYNC_DATABASE_URL = DatabaseConfig.get_async_database_url()
