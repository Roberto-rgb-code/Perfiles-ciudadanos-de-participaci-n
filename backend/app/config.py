from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://ccpc:ccpc@localhost:5433/segmentador_zmg"
    data_raw: Path = Path("/data/raw")
    data_processed: Path = Path("/data/processed")
    n_clusters: int = 5
    cors_origins: str = "http://localhost:4200,http://localhost:8080"

    # Municipios ZMG (nombres como en Sociodemografico.MUNS)
    zmg_municipios: tuple[str, ...] = (
        "Guadalajara",
        "Zapopan",
        "San Pedro Tlaquepaque",
        "Tlaquepaque",
        "Tonalá",
        "Tonala",
        "Tlajomulco de Zúñiga",
        "Tlajomulco de Zuñiga",
        "Tlajomulco",
        "El Salto",
        "Juanacatlán",
        "Juanacatlan",
        "Ixtlahuacán de los Membrillos",
        "Ixtlahuacan de los Membrillos",
    )


settings = Settings()
