from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[3]

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / '.env'),
        env_file_encoding='utf-8-sig',
        extra='ignore'
    )

    APP_NAME: str = 'ERP Intermotores v14'
    APP_VERSION: str = '15.6.0'
    ENVIRONMENT: str = 'development'
    DATABASE_URL: str
    SECRET_KEY: str = 'change-me'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    DEFAULT_TIMEZONE: str = 'America/Guatemala'
    DEFAULT_DATE_FORMAT: str = 'dd/MM/yyyy'
    DEFAULT_TIME_FORMAT: str = 'HH:mm:ss'
    DEFAULT_CURRENCY: str = 'GTQ'
    DEFAULT_TAX_RATE: float = 12.0
    DEFAULT_OFFER_DISCOUNT_PERCENT: float = 10.0
    COSTS_INCLUDE_TAX: bool = True

    CORS_ORIGINS: str = 'http://localhost:4200'

settings = Settings()
