from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings

app = FastAPI(
    title="Perfiles ciudadanos de participación — ZMG",
    description="Reto 1 INE · Perfiles ciudadanos de participación (piloto ZMG Jalisco)",
    version="0.1.0",
)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _processed() -> Path:
    return Path(settings.data_processed)


@app.get("/api/health")
def health():
    geo = _processed() / "colonias_clusters.geojson"
    meta = _processed() / "perfiles.json"
    return {
        "ok": geo.is_file() and meta.is_file(),
        "geojson": geo.is_file(),
        "perfiles": meta.is_file(),
        "universo": "ZMG Jalisco",
        "n_clusters": settings.n_clusters,
    }


@app.get("/api/perfiles")
def perfiles():
    path = _processed() / "perfiles.json"
    if not path.is_file():
        raise HTTPException(503, "Pipeline no ha generado perfiles aún")
    return json.loads(path.read_text(encoding="utf-8-sig"))


@app.get("/api/perfiles/{cluster_id}")
def perfil_detalle(cluster_id: int):
    data = perfiles()
    for p in data.get("perfiles", []):
        if p.get("cluster_id") == cluster_id:
            return p
    raise HTTPException(404, "Cluster no encontrado")


@app.get("/api/geojson")
def geojson():
    path = _processed() / "colonias_clusters.geojson"
    if not path.is_file():
        raise HTTPException(503, "GeoJSON no disponible")
    return FileResponse(path, media_type="application/geo+json")


@app.get("/api/stats")
def stats():
    data = perfiles()
    perfiles_list = data.get("perfiles", [])
    return {
        "n_colonias": data.get("n_colonias"),
        "municipios": data.get("municipios"),
        "k": data.get("k"),
        "features": data.get("features"),
        "por_cluster": [
            {
                "cluster_id": p["cluster_id"],
                "nombre": p["nombre"],
                "color": p["color"],
                "n_colonias": p["n_colonias"],
                "pct_universo": p["pct_universo"],
                "tasa_2024": p["metricas"]["tasa_2024"],
                "poblacion": p["metricas"]["poblacion"],
            }
            for p in perfiles_list
        ],
    }


@app.post("/api/pipeline/run")
def pipeline_run():
    """Re-ejecuta ETL (puede tardar)."""
    import os

    os.environ["FORCE_ETL"] = "1"
    from scripts.run_pipeline import main as run

    code = run()
    if code != 0:
        raise HTTPException(500, "ETL falló")
    return {"status": "ok"}
