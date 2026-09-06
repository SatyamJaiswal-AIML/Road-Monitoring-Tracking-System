from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./urbaneye.db"
    EDGE_API_KEY: str = "bel_sih_edge_secret_token_2026"
    DETECTION_CONFIDENCE_THRESHOLD: float = 0.50
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Security & CORS Settings
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    RATE_LIMIT_PER_MINUTE: int = 120
    REPLAY_WINDOW_MINUTES: int = 30
    DPDP_ANONYMIZE_PLATES: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        return [orig.strip() for orig in self.ALLOWED_ORIGINS.split(",") if orig.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
