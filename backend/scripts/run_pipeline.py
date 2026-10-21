"""Entrypoint Docker: corre ETL si no hay artefactos o FORCE_ETL=1."""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import settings  # noqa: E402


def main() -> int:
    out = Path(os.environ.get("DATA_PROCESSED", settings.data_processed))
    force = os.environ.get("FORCE_ETL", "0") == "1"
    geo = out / "colonias_clusters.geojson"
    meta = out / "perfiles.json"
    if geo.is_file() and meta.is_file() and not force:
        print("Artefactos presentes — skip ETL (FORCE_ETL=1 para regenerar)")
        # still try DB load if empty
        try:
            from scripts.etl_cluster import persist_db
            import geopandas as gpd
            import json

            gdf = gpd.read_file(geo)
            m = json.loads(meta.read_text(encoding="utf-8"))
            persist_db(gdf, m)
        except Exception as e:
            print(f"DB warm skipped: {e}")
        return 0

    from scripts.etl_cluster import main as etl_main

    return etl_main()


if __name__ == "__main__":
    raise SystemExit(main())
