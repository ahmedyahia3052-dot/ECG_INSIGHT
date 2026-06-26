from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the standalone AI service."""

    app_name: str = "ECG Insight AI Engine"
    model_registry_path: str = "models/registry.json"
    onnx_model_path: str | None = None
    require_model_signature: bool = True

    model_config = SettingsConfigDict(env_prefix="ECG_AI_", env_file=".env")


settings = Settings()
