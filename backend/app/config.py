"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-driven configuration for the ALRT backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    anthropic_api_key: str = ""
    # Default to Sonnet 4.6 — the current latest in the Claude 4.x vision
    # family. The PRD originally pinned 4.5 (drafted before 4.6 shipped); the
    # Phase 1.5 hardening pass updated the default. Override via env var if
    # accuracy or cost benchmarking favors a different model.
    anthropic_model: str = "claude-sonnet-4-6"
    max_batch_size: int = 300
    max_concurrent_requests: int = 10


settings = Settings()
