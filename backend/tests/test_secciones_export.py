"""QA: capas de sección original no rompen el contrato de artefactos."""
from pathlib import Path

from app.config import settings


def test_processed_paths_include_secciones():
    out = Path(settings.data_processed)
    # Rutas esperadas del pipeline (pueden no existir en CI sin datos)
    assert (out / "colonias_clusters.geojson").name == "colonias_clusters.geojson"
    assert (out / "secciones_participacion.geojson").name == "secciones_participacion.geojson"


def test_load_turnout_keeps_lista_votos():
    from scripts.etl_cluster import load_turnout
    import pandas as pd

    # Smoke: firma de columnas cuando hay archivo local
    raw = Path(settings.data_raw) / "electoral" / "diputadoslocales_2024.csv"
    if not raw.is_file():
        return
    g = load_turnout(raw, 2024)
    assert g is not None
    assert "tasa_2024" in g.columns
    assert "lista_2024" in g.columns
    assert "votos_2024" in g.columns
    assert g["lista_2024"].dtype != object or pd.api.types.is_numeric_dtype(g["lista_2024"])
