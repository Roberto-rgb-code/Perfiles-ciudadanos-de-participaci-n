"""
ETL ZMG: colonias + NSE + participación (dip. locales 2018/2021/2024) → K-Means.
Salidas: GeoJSON + CSV + perfiles JSON en DATA_PROCESSED.
"""
from __future__ import annotations

import json
import os
import re
import sys
import warnings
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.config import settings  # noqa: E402
from app.profiles import templates_for_k  # noqa: E402

warnings.filterwarnings("ignore", category=UserWarning)
os.environ.setdefault("OGR_GEOMETRY_ACCEPT_UNCLOSED_RING", "YES")

ZMG_NORM = {re.sub(r"\s+", " ", m.lower().strip()): m for m in settings.zmg_municipios}


def _fix_geometries(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    """Repara geometrías inválidas / vacías tras lectura o simplify."""
    try:
        from shapely import make_valid

        gdf = gdf.copy()
        gdf["geometry"] = gdf.geometry.apply(
            lambda g: make_valid(g) if g is not None and not g.is_empty else g
        )
    except Exception:
        gdf = gdf.copy()
        gdf["geometry"] = gdf.buffer(0)
    return gdf[~gdf.geometry.isna() & ~gdf.geometry.is_empty].copy()


def _read_shp(path: Path) -> gpd.GeoDataFrame:
    """Lee shapefile tolerando anillos no cerrados y repara geometrías."""
    try:
        gdf = gpd.read_file(path, engine="fiona")
    except Exception:
        gdf = gpd.read_file(path)
    return _fix_geometries(gdf)


def _norm_mun(name: str) -> str:
    s = re.sub(r"\s+", " ", str(name or "").lower().strip())
    s = (
        s.replace("ú", "u")
        .replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ñ", "n")
    )
    aliases = {
        "san pedro tlaquepaque": "tlaquepaque",
        "tlajomulco de zuniga": "tlajomulco",
        "ixtlahuacan de los membrillos": "ixtlahuacan de los membrillos",
        "juanacatlan": "juanacatlan",
        "tonala": "tonala",
    }
    return aliases.get(s, s)


ZMG_KEYS = {_norm_mun(m) for m in settings.zmg_municipios}


def _mun_parts(name: str) -> list[str]:
    """MUNS puede ser 'Guadalajara,Zapopan' en límites municipales."""
    return [_norm_mun(p) for p in str(name or "").split(",") if str(p).strip()]


def _is_zmg_muns(name: str) -> bool:
    return any(p in ZMG_KEYS for p in _mun_parts(name))


def _primary_zmg_mun(name: str) -> str:
    parts = _mun_parts(name)
    for p in parts:
        if p in ZMG_KEYS:
            return p
    return parts[0] if parts else ""


def safe_div(a, b):
    a = pd.to_numeric(a, errors="coerce")
    b = pd.to_numeric(b, errors="coerce")
    out = a / b.replace(0, np.nan)
    return out.fillna(0.0)


def load_turnout(path: Path, year: int) -> pd.DataFrame | None:
    if path.suffix.lower() == ".csv":
        df = pd.read_csv(path, low_memory=False)
    else:
        # reportes IEPC a veces traen título en fila 0
        df = pd.read_excel(path, header=0)
        if "SECCION" not in [str(c).upper() for c in df.columns] and "LISTA_NOMINAL" not in [
            str(c).upper() for c in df.columns
        ]:
            df = pd.read_excel(path, header=1)

    cols = {str(c).upper().strip(): c for c in df.columns}
    sec = cols.get("SECCION")
    ln = (
        cols.get("LISTA_NOMINAL")
        or cols.get("LISTA_NOMINAL_CASILLA")
        or cols.get("LISTA NOMINAL")
    )
    tot = cols.get("TOTAL_VOTOS") or cols.get("TOTAL_VOTOS_ACTA") or cols.get("TOTAL_CIUDADANOS_VOTARON")
    if not sec or not ln or not tot:
        print(f"WARN: {path.name} sin SECCION/LISTA/TOTAL — omitido ({year})")
        return None

    tmp = pd.DataFrame(
        {
            "seccion": df[sec].astype(str).str.strip().str.replace(r"\.0$", "", regex=True),
            "lista": pd.to_numeric(df[ln], errors="coerce").fillna(0),
            "votos": pd.to_numeric(df[tot], errors="coerce").fillna(0),
        }
    )
    g = tmp.groupby("seccion", as_index=False).agg(lista=("lista", "sum"), votos=("votos", "sum"))
    g[f"tasa_{year}"] = safe_div(g["votos"], g["lista"]).clip(0, 1)
    return g[["seccion", f"tasa_{year}"]]


def load_colonias(raw: Path) -> gpd.GeoDataFrame:
    gdf = _read_shp(raw / "Sociodemografico" / "ISDCOL2020_2021F.shp")
    # Incluir colonias en límites (MUNS compuestos: "Guadalajara,Zapopan")
    gdf = gdf[gdf["MUNS"].map(_is_zmg_muns)].copy()
    gdf["mun_key"] = gdf["MUNS"].map(_primary_zmg_mun)
    if gdf.crs is None:
        gdf = gdf.set_crs(4326)
    gdf = gdf.to_crs(4326)
    # features
    for c in ["POBTOT", "POBFEM", "P_18A24", "P_60YMAS", "P_15YMAS", "GRAPROES", "P_18YMAS"]:
        if c not in gdf.columns:
            # try variants
            alt = [x for x in gdf.columns if x.upper().replace("__", "_") == c]
            if alt:
                gdf[c] = gdf[alt[0]]
            else:
                gdf[c] = 0
        gdf[c] = pd.to_numeric(gdf[c], errors="coerce").fillna(0)
    base_den = gdf["P_15YMAS"].where(gdf["P_15YMAS"] > 0, gdf["POBTOT"])
    gdf["pct_joven"] = safe_div(gdf["P_18A24"], base_den)
    gdf["pct_mayor"] = safe_div(gdf["P_60YMAS"], base_den)
    gdf["pct_mujer"] = safe_div(gdf["POBFEM"], gdf["POBTOT"])
    gdf["escolaridad"] = gdf["GRAPROES"].clip(0, 20)
    return gdf


def attach_nse(colonias: gpd.GeoDataFrame, raw: Path) -> gpd.GeoDataFrame:
    nse = _read_shp(raw / "Nivel_socioeconomico" / "AGEB_NSE_JAL.shp")
    if nse.crs is None:
        nse = nse.set_crs(4326)
    nse = nse.to_crs(4326)
    # NSE may be categorical string — map to ordinal
    nse_col = "NSE" if "NSE" in nse.columns else [c for c in nse.columns if "NSE" in c.upper()][0]
    nse["nse_raw"] = nse[nse_col].astype(str)
    order = {"E": 1, "D": 2, "D+": 3, "C-": 4, "C": 5, "C+": 6, "B": 7, "A/B": 8, "A": 9}
    nse["nse_score"] = nse["nse_raw"].map(lambda x: order.get(x.strip().upper(), np.nan))
    # numeric fallback
    num = pd.to_numeric(nse["nse_raw"], errors="coerce")
    nse.loc[nse["nse_score"].isna(), "nse_score"] = num
    nse["nse_score"] = nse["nse_score"].fillna(nse["nse_score"].median())

    pts = colonias.copy()
    pts["geometry"] = pts.geometry.representative_point()
    joined = gpd.sjoin(pts[["NUMCOL", "geometry"]], nse[["nse_score", "geometry"]], how="left", predicate="within")
    if joined["nse_score"].isna().mean() > 0.5:
        joined = gpd.sjoin_nearest(
            pts[["NUMCOL", "geometry"]].to_crs(3857),
            nse[["nse_score", "geometry"]].to_crs(3857),
            how="left",
            max_distance=800,
        ).to_crs(4326)
    agg = joined.groupby("NUMCOL", as_index=False)["nse_score"].mean()
    out = colonias.merge(agg, on="NUMCOL", how="left")
    out["nse_score"] = out["nse_score"].fillna(out["nse_score"].median())
    return out


def attach_turnout(colonias: gpd.GeoDataFrame, raw: Path) -> gpd.GeoDataFrame:
    sec = _read_shp(raw / "Cartografia_electoral" / "SECCION.shp")
    if sec.crs is None:
        # cartografia IEPC often UTM
        try:
            sec = sec.set_crs(32613)
        except Exception:
            sec = sec.set_crs(4326)
    sec = sec.to_crs(4326)
    sec["seccion"] = sec["seccion"].astype(str).str.replace(r"\.0$", "", regex=True)

    turns: list[pd.DataFrame] = []
    mapping = {
        2018: raw / "electoral" / "diputadoslocales_2018.xlsx",
        2021: raw / "electoral" / "diputadoslocales_2021.xlsx",
        2024: raw / "electoral" / "diputadoslocales_2024.csv",
    }
    for year, path in mapping.items():
        if path.is_file():
            loaded = load_turnout(path, year)
            if loaded is not None:
                turns.append(loaded)
    if not turns:
        raise RuntimeError("No se pudo cargar ninguna tasa de participación")
    t = turns[0]
    for other in turns[1:]:
        t = t.merge(other, on="seccion", how="outer")
    for y in (2018, 2021, 2024):
        col = f"tasa_{y}"
        if col not in t.columns:
            t[col] = np.nan
    # Si falta 2018, aproximar con 2021
    if t["tasa_2018"].isna().all() and t["tasa_2021"].notna().any():
        t["tasa_2018"] = t["tasa_2021"]
        print("INFO: tasa_2018 aproximada con 2021 (archivo 2018 sin lista nominal)")
    sec = sec.merge(t, on="seccion", how="left")

    pts = colonias.copy()
    pts["geometry"] = pts.geometry.representative_point()
    j = gpd.sjoin(
        pts[["NUMCOL", "geometry"]],
        sec[["seccion", "tasa_2018", "tasa_2021", "tasa_2024", "geometry"]],
        how="left",
        predicate="within",
    )
    if j["tasa_2024"].isna().mean() > 0.4:
        j = gpd.sjoin_nearest(
            pts[["NUMCOL", "geometry"]].to_crs(3857),
            sec[["seccion", "tasa_2018", "tasa_2021", "tasa_2024", "geometry"]].to_crs(3857),
            how="left",
            max_distance=1200,
        )
        # geometry already projected; drop geom for merge
        j = j.drop(columns=["geometry"], errors="ignore")
    agg = j.groupby("NUMCOL", as_index=False).agg(
        tasa_2018=("tasa_2018", "mean"),
        tasa_2021=("tasa_2021", "mean"),
        tasa_2024=("tasa_2024", "mean"),
        seccion=("seccion", "first"),
    )
    out = colonias.merge(agg, on="NUMCOL", how="left")
    for c in ("tasa_2018", "tasa_2021", "tasa_2024"):
        out[c] = out[c].fillna(out[c].median()).clip(0, 1)
    out["tasa_media"] = out[["tasa_2018", "tasa_2021", "tasa_2024"]].mean(axis=1)
    out["delta_part"] = out["tasa_2024"] - out["tasa_2018"]
    return out


def run_kmeans(gdf: gpd.GeoDataFrame, k: int) -> tuple[gpd.GeoDataFrame, dict]:
    features = [
        "pct_joven",
        "pct_mayor",
        "pct_mujer",
        "escolaridad",
        "nse_score",
        "tasa_2018",
        "tasa_2021",
        "tasa_2024",
        "delta_part",
    ]
    X = gdf[features].astype(float).fillna(0)
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)
    model = KMeans(n_clusters=k, random_state=42, n_init=20)
    labels = model.fit_predict(Xs)
    gdf = gdf.copy()
    gdf["cluster_id"] = labels.astype(int)

    # Order clusters by mean participation for stable narrative assignment
    order = (
        gdf.groupby("cluster_id")["tasa_media"].mean().sort_values().index.tolist()
    )
    remap = {old: new for new, old in enumerate(order)}
    gdf["cluster_id"] = gdf["cluster_id"].map(remap)

    templates = templates_for_k(k)
    # Assign templates by sorted cluster id
    # 0 = lowest participation → jovenes-distantes / periferia
    # highest → veteranos
    assign_order = [0, 3, 2, 4, 1]  # template indices for cluster 0..k-1
    perfiles = []
    for cid in range(k):
        tpl = templates[assign_order[cid] % len(templates)].copy()
        sub = gdf[gdf["cluster_id"] == cid]
        tpl["cluster_id"] = cid
        tpl["n_colonias"] = int(len(sub))
        tpl["pct_universo"] = round(100 * len(sub) / max(len(gdf), 1), 1)
        tpl["metricas"] = {
            "pct_joven_prom": round(float(sub["pct_joven"].mean()) * 100, 1),
            "pct_mayor_prom": round(float(sub["pct_mayor"].mean()) * 100, 1),
            "pct_mujer_prom": round(float(sub["pct_mujer"].mean()) * 100, 1),
            "escolaridad_prom": round(float(sub["escolaridad"].mean()), 2),
            "nse_prom": round(float(sub["nse_score"].mean()), 2),
            "tasa_2018": round(float(sub["tasa_2018"].mean()) * 100, 1),
            "tasa_2021": round(float(sub["tasa_2021"].mean()) * 100, 1),
            "tasa_2024": round(float(sub["tasa_2024"].mean()) * 100, 1),
            "poblacion": int(sub["POBTOT"].sum()),
        }
        perfiles.append(tpl)

    meta = {
        "k": k,
        "n_colonias": len(gdf),
        "features": features,
        "municipios": sorted(gdf["MUNS"].dropna().unique().tolist()),
        "perfiles": perfiles,
    }
    return gdf, meta


def persist_db(gdf: gpd.GeoDataFrame, meta: dict) -> None:
    url = os.environ.get("DATABASE_URL", settings.database_url)
    # SQLAlchemy geoalchemy optional — use geopandas to_postgis
    try:
        from sqlalchemy import create_engine, text

        engine = create_engine(url)
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        gdf_out = gdf.copy()
        keep = [
            "NUMCOL",
            "MUNS",
            "NOMBRE",
            "POBTOT",
            "pct_joven",
            "pct_mayor",
            "pct_mujer",
            "escolaridad",
            "nse_score",
            "tasa_2018",
            "tasa_2021",
            "tasa_2024",
            "tasa_media",
            "delta_part",
            "cluster_id",
            "seccion",
            "geometry",
        ]
        keep = [c for c in keep if c in gdf_out.columns]
        gdf_out[keep].to_postgis("colonias_cluster", engine, if_exists="replace", index=False)
        with engine.begin() as conn:
            conn.execute(text("DROP TABLE IF EXISTS perfiles_meta"))
            conn.execute(
                text(
                    "CREATE TABLE perfiles_meta (id serial PRIMARY KEY, payload jsonb)"
                )
            )
            conn.execute(
                text("INSERT INTO perfiles_meta (payload) VALUES (CAST(:p AS jsonb))"),
                {"p": json.dumps(meta, ensure_ascii=False)},
            )
        print("DB: colonias_cluster + perfiles_meta OK")
    except Exception as e:
        print(f"WARN DB persist skipped: {e}")


def main() -> int:
    raw = Path(os.environ.get("DATA_RAW", settings.data_raw))
    out = Path(os.environ.get("DATA_PROCESSED", settings.data_processed))
    out.mkdir(parents=True, exist_ok=True)
    k = int(os.environ.get("N_CLUSTERS", settings.n_clusters))

    print("=== ETL Segmentador CCPC ZMG ===")
    print(f"raw={raw} out={out} k={k}")
    gdf = load_colonias(raw)
    print(f"Colonias ZMG: {len(gdf)}")
    if len(gdf) < 50:
        print("ERROR: pocas colonias; revisa nombres MUNS")
        return 1
    gdf = attach_nse(gdf, raw)
    gdf = attach_turnout(gdf, raw)
    gdf, meta = run_kmeans(gdf, k)

    # Simplify suave: tolerancia alta abría huecos visibles entre colonias vecinas
    gdf_web = gdf.copy()
    gdf_web["geometry"] = gdf_web.geometry.simplify(0.00003, preserve_topology=True)
    gdf_web = _fix_geometries(gdf_web)

    geo_path = out / "colonias_clusters.geojson"
    csv_path = out / "colonias_clusters.csv"
    meta_path = out / "perfiles.json"
    gdf_web.to_file(geo_path, driver="GeoJSON")
    pd.DataFrame(gdf_web.drop(columns="geometry")).to_csv(csv_path, index=False)
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {geo_path}")
    print(f"Wrote {meta_path}")
    for p in meta["perfiles"]:
        print(f"  cluster {p['cluster_id']}: {p['nombre']} n={p['n_colonias']} part2024={p['metricas']['tasa_2024']}%")

    persist_db(gdf_web, meta)
    print("ETL OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
