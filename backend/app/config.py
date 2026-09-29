from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "postgresql://postgres:postgres@localhost:5433/dealmind"
    llm_base_url: str = "https://api.groq.com/openai/v1"
    llm_api_key: str = ""
    llm_model: str = "openai/gpt-oss-20b"
    hindsight_api_url: str = "http://localhost:8888"
    hindsight_api_key: str = ""
    hindsight_bank_id: str = "dealmind-demo"
    hindsight_api_llm_provider: str = "groq"
    hindsight_api_llm_api_key: str = ""
    hindsight_api_llm_model: str = "openai/gpt-oss-20b"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    port: int = 8001

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
