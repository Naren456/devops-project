from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "StockDesk API"
    database_url: str = "postgresql+psycopg://stockdesk:stockdesk@localhost:5432/stockdesk"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
