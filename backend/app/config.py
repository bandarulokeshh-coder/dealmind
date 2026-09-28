from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "sqlite:///./dealmind.db"
    llm_base_url: str = "https://api.groq.com/openai/v1"
    llm_api_key: str = ""
    llm_model: str = "llama-3.3-70b-versatile"
    hindsight_api_url: str = "http://localhost:8888"
    hindsight_api_key: str = ""
    hindsight_bank_id: str = "dealmind-demo"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    port: int = 8000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
