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
    anthropic_model: str = "claude-sonnet-4-6"
    anthropic_max_tokens: int = 1000

    # Set VISION_PROVIDER=gemini to route extraction through Gemini instead of Claude.
    vision_provider: str = "claude"  # "claude" | "gemini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    max_batch_size: int = 300
    max_concurrent_requests: int = 10


settings = Settings()
