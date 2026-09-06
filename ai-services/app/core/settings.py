from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    port: int = 8001

    backend_callback_url: str = "http://localhost:5000/api/v1"
    mongodb_uri: str = "mongodb://localhost:27017/safesathi"

    # Vosk model paths — see ai-services/README.md for what's actually
    # downloadable right now (English and Hindi; Bengali is a documented
    # upstream gap, not a bug here).
    vosk_model_path_en: str = "./models/vosk-model-small-en-us-0.15"
    vosk_model_path_hi: str = "./models/vosk-model-small-hi-0.22"
    vosk_model_path_bn: str = "./models/vosk-model-small-bn"

    # SafeScore factor weights — see docs/architecture/SAFESCORE_ALGORITHM.md.
    # Configuration, not a hard-coded formula, so they can be tuned as real
    # usage data comes in without a code change.
    safescore_weight_time: float = 0.15
    safescore_weight_crime: float = 0.20
    safescore_weight_light: float = 0.10
    safescore_weight_battery: float = 0.05
    safescore_weight_motion: float = 0.15
    safescore_weight_reports: float = 0.20
    safescore_weight_trust: float = 0.15

    motion_classifier_path: str = "./app/ml_artifacts/motion_classifier.joblib"
    motion_classifier_metadata_path: str = "./app/ml_artifacts/motion_classifier_metadata.json"


settings = Settings()
