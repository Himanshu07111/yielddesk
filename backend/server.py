from fastapi import FastAPI, APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import csv
import random
import asyncio
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone
import requests as http_requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ─── Yield Curve Base Data (Realistic US Treasury Rates) ────────────
YIELD_CURVE_BASE = [
    {"tenor": "1M", "yield_pct": 5.30, "order": 1},
    {"tenor": "3M", "yield_pct": 5.25, "order": 2},
    {"tenor": "6M", "yield_pct": 5.15, "order": 3},
    {"tenor": "1Y", "yield_pct": 4.95, "order": 4},
    {"tenor": "2Y", "yield_pct": 4.60, "order": 5},
    {"tenor": "5Y", "yield_pct": 4.25, "order": 6},
    {"tenor": "10Y", "yield_pct": 4.40, "order": 7},
    {"tenor": "20Y", "yield_pct": 4.65, "order": 8},
    {"tenor": "30Y", "yield_pct": 4.55, "order": 9},
]

# ─── FRED API Configuration ─────────────────────────────────────────
FRED_API_KEY = os.environ.get("FRED_API_KEY", "")
FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations"
FRED_SERIES = {
    "1M": "DGS1MO", "3M": "DGS3MO", "6M": "DGS6MO", "1Y": "DGS1",
    "2Y": "DGS2", "5Y": "DGS5", "10Y": "DGS10", "20Y": "DGS20", "30Y": "DGS30",
}
_fred_cache = {"data": None, "timestamp": None}


async def fetch_fred_yield_curve():
    global _fred_cache
    if not FRED_API_KEY:
        return None
    now = datetime.now(timezone.utc)
    if _fred_cache["data"] and _fred_cache["timestamp"]:
        if (now - _fred_cache["timestamp"]).total_seconds() < 55:
            return _fred_cache["data"]

    async def fetch_one(tenor, series_id, order):
        def _fetch():
            try:
                resp = http_requests.get(
                    FRED_BASE_URL,
                    params={
                        "series_id": series_id, "api_key": FRED_API_KEY,
                        "file_type": "json", "sort_order": "desc", "limit": 10,
                    },
                    timeout=10,
                )
                resp.raise_for_status()
                for obs in resp.json().get("observations", []):
                    if obs["value"] != ".":
                        return {"tenor": tenor, "yield_pct": float(obs["value"]), "order": order}
                return None
            except Exception:
                return None
        return await asyncio.to_thread(_fetch)

    tasks = [fetch_one(t, sid, i + 1) for i, (t, sid) in enumerate(FRED_SERIES.items())]
    results = await asyncio.gather(*tasks)
    if any(r is None for r in results):
        return None
    _fred_cache["data"] = results
    _fred_cache["timestamp"] = now
    return results

# ─── Mock Bond Universe ─────────────────────────────────────────────
MOCK_BONDS = [
    {"id": "BOND001", "name": "US Treasury 1Y", "isin": "US912797GZ84", "yield_pct": 4.95, "maturity_date": "2027-01-15", "credit_rating": "AAA", "bond_type": "Government", "price": 99.12, "coupon": 4.750, "change_1d": 0.02},
    {"id": "BOND002", "name": "US Treasury 2Y", "isin": "US912828ZT09", "yield_pct": 4.62, "maturity_date": "2028-02-15", "credit_rating": "AAA", "bond_type": "Government", "price": 99.25, "coupon": 4.500, "change_1d": 0.03},
    {"id": "BOND003", "name": "US Treasury 5Y", "isin": "US91282CJL09", "yield_pct": 4.28, "maturity_date": "2031-02-15", "credit_rating": "AAA", "bond_type": "Government", "price": 98.75, "coupon": 4.125, "change_1d": -0.02},
    {"id": "BOND004", "name": "US Treasury 10Y", "isin": "US91282CHV19", "yield_pct": 4.42, "maturity_date": "2035-11-15", "credit_rating": "AAA", "bond_type": "Government", "price": 97.50, "coupon": 4.000, "change_1d": 0.05},
    {"id": "BOND005", "name": "US Treasury 30Y", "isin": "US912810TM53", "yield_pct": 4.57, "maturity_date": "2055-02-15", "credit_rating": "AAA", "bond_type": "Government", "price": 96.80, "coupon": 4.250, "change_1d": -0.03},
    {"id": "BOND006", "name": "UK Gilt 10Y", "isin": "GB00BNNGP775", "yield_pct": 4.15, "maturity_date": "2035-07-22", "credit_rating": "AA", "bond_type": "Government", "price": 98.20, "coupon": 3.750, "change_1d": 0.01},
    {"id": "BOND007", "name": "German Bund 10Y", "isin": "DE0001102580", "yield_pct": 2.38, "maturity_date": "2035-08-15", "credit_rating": "AAA", "bond_type": "Government", "price": 101.50, "coupon": 2.500, "change_1d": -0.01},
    {"id": "BOND008", "name": "Japan JGB 10Y", "isin": "JP1103561M89", "yield_pct": 1.05, "maturity_date": "2035-06-20", "credit_rating": "A", "bond_type": "Government", "price": 100.25, "coupon": 1.000, "change_1d": 0.02},
    {"id": "BOND009", "name": "Apple Inc 2030", "isin": "US037833EG88", "yield_pct": 4.15, "maturity_date": "2030-05-11", "credit_rating": "AA", "bond_type": "Corporate", "price": 98.90, "coupon": 3.850, "change_1d": -0.01},
    {"id": "BOND010", "name": "Microsoft Corp 2028", "isin": "US594918CE21", "yield_pct": 3.95, "maturity_date": "2028-11-03", "credit_rating": "AAA", "bond_type": "Corporate", "price": 99.45, "coupon": 3.750, "change_1d": 0.00},
    {"id": "BOND011", "name": "JPMorgan Chase 2029", "isin": "US46647PCR64", "yield_pct": 4.85, "maturity_date": "2029-09-22", "credit_rating": "A", "bond_type": "Corporate", "price": 97.80, "coupon": 4.500, "change_1d": 0.04},
    {"id": "BOND012", "name": "Goldman Sachs 2031", "isin": "US38141GYS65", "yield_pct": 5.12, "maturity_date": "2031-03-15", "credit_rating": "A", "bond_type": "Corporate", "price": 96.50, "coupon": 4.750, "change_1d": 0.06},
    {"id": "BOND013", "name": "Amazon.com 2032", "isin": "US023135BU40", "yield_pct": 4.45, "maturity_date": "2032-12-01", "credit_rating": "AA", "bond_type": "Corporate", "price": 98.15, "coupon": 4.100, "change_1d": -0.02},
    {"id": "BOND014", "name": "Meta Platforms 2027", "isin": "US30303M8Q83", "yield_pct": 4.72, "maturity_date": "2027-08-15", "credit_rating": "A", "bond_type": "Corporate", "price": 99.10, "coupon": 4.450, "change_1d": 0.01},
    {"id": "BOND015", "name": "Tesla Inc 2029", "isin": "US88160RAE18", "yield_pct": 6.85, "maturity_date": "2029-10-01", "credit_rating": "BB", "bond_type": "Corporate", "price": 92.30, "coupon": 5.300, "change_1d": -0.08},
    {"id": "BOND016", "name": "AT&T Inc 2033", "isin": "US00206RMK49", "yield_pct": 5.45, "maturity_date": "2033-06-01", "credit_rating": "BBB", "bond_type": "Corporate", "price": 95.60, "coupon": 4.850, "change_1d": 0.03},
    {"id": "BOND017", "name": "Verizon Comm 2030", "isin": "US92343VGH78", "yield_pct": 5.22, "maturity_date": "2030-03-22", "credit_rating": "BBB", "bond_type": "Corporate", "price": 96.90, "coupon": 4.900, "change_1d": -0.01},
    {"id": "BOND018", "name": "Boeing Co 2028", "isin": "US097023DG73", "yield_pct": 5.68, "maturity_date": "2028-05-01", "credit_rating": "BBB", "bond_type": "Corporate", "price": 95.10, "coupon": 5.150, "change_1d": 0.07},
    {"id": "BOND019", "name": "NY State GO 2029", "isin": "US6499054A48", "yield_pct": 3.25, "maturity_date": "2029-10-01", "credit_rating": "AA", "bond_type": "Municipal", "price": 100.80, "coupon": 3.500, "change_1d": 0.00},
    {"id": "BOND020", "name": "California GO 2031", "isin": "US13063DPR86", "yield_pct": 3.45, "maturity_date": "2031-04-01", "credit_rating": "AA", "bond_type": "Municipal", "price": 100.25, "coupon": 3.600, "change_1d": -0.01},
    {"id": "BOND021", "name": "Texas State GO 2028", "isin": "US882724ZV30", "yield_pct": 3.05, "maturity_date": "2028-08-15", "credit_rating": "AAA", "bond_type": "Municipal", "price": 101.10, "coupon": 3.250, "change_1d": 0.01},
    {"id": "BOND022", "name": "Illinois GO 2030", "isin": "US452152PF07", "yield_pct": 4.15, "maturity_date": "2030-01-01", "credit_rating": "BBB", "bond_type": "Municipal", "price": 97.90, "coupon": 3.850, "change_1d": 0.03},
    {"id": "BOND023", "name": "Florida State GO 2027", "isin": "US341150FS27", "yield_pct": 2.95, "maturity_date": "2027-07-01", "credit_rating": "AA", "bond_type": "Municipal", "price": 101.40, "coupon": 3.150, "change_1d": -0.01},
    {"id": "BOND024", "name": "NYC Water Auth 2032", "isin": "US64972GDH82", "yield_pct": 3.55, "maturity_date": "2032-06-15", "credit_rating": "AA", "bond_type": "Municipal", "price": 100.05, "coupon": 3.650, "change_1d": 0.01},
    {"id": "BOND025", "name": "LA County 2029", "isin": "US544647AL72", "yield_pct": 3.75, "maturity_date": "2029-09-01", "credit_rating": "A", "bond_type": "Municipal", "price": 99.50, "coupon": 3.700, "change_1d": 0.02},
]


# ─── Startup: Seed Database ─────────────────────────────────────────
@app.on_event("startup")
async def seed_data():
    await db.bonds.drop()
    await db.bonds.insert_many([{**b} for b in MOCK_BONDS])
    await db.bonds.create_index("yield_pct")
    await db.bonds.create_index("credit_rating")
    await db.bonds.create_index("bond_type")
    await db.bonds.create_index("maturity_date")
    await db.bonds.create_index("name")
    logger.info(f"Seeded {len(MOCK_BONDS)} bonds to database")


# ─── Routes ─────────────────────────────────────────────────────────
@api_router.get("/")
async def root():
    return {"message": "YieldDesk API"}


@api_router.get("/yield-curve")
async def get_yield_curve():
    now = datetime.now(timezone.utc)
    fred_curve = await fetch_fred_yield_curve()
    if fred_curve:
        return {
            "date": now.strftime("%Y-%m-%d"),
            "last_updated": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "curve": fred_curve,
            "source": "live",
        }
    curve = []
    for point in YIELD_CURVE_BASE:
        variation = random.uniform(-0.05, 0.05)
        curve.append({
            "tenor": point["tenor"],
            "yield_pct": round(point["yield_pct"] + variation, 3),
            "order": point["order"],
        })
    return {
        "date": now.strftime("%Y-%m-%d"),
        "last_updated": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "curve": curve,
        "source": "mock",
    }


def build_bond_query(min_yield, max_yield, rating, bond_type, maturity_before, maturity_after):
    query = {}
    if min_yield is not None or max_yield is not None:
        yield_q = {}
        if min_yield is not None:
            yield_q["$gte"] = min_yield
        if max_yield is not None:
            yield_q["$lte"] = max_yield
        query["yield_pct"] = yield_q
    if rating:
        ratings = [r.strip() for r in rating.split(",") if r.strip()]
        if ratings:
            query["credit_rating"] = {"$in": ratings}
    if bond_type:
        types = [t.strip() for t in bond_type.split(",") if t.strip()]
        if types:
            query["bond_type"] = {"$in": types}
    if maturity_before:
        query.setdefault("maturity_date", {})["$lte"] = maturity_before
    if maturity_after:
        query.setdefault("maturity_date", {})["$gte"] = maturity_after
    return query


@api_router.get("/bonds")
async def get_bonds(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    sort_by: str = Query("name"),
    sort_order: str = Query("asc"),
    min_yield: Optional[float] = None,
    max_yield: Optional[float] = None,
    rating: Optional[str] = None,
    bond_type: Optional[str] = None,
    maturity_before: Optional[str] = None,
    maturity_after: Optional[str] = None,
):
    allowed_sort_fields = {
        "id",
        "name",
        "isin",
        "yield_pct",
        "maturity_date",
        "credit_rating",
        "bond_type",
        "price",
        "coupon",
        "change_1d",
    }
    if sort_by not in allowed_sort_fields:
        raise HTTPException(status_code=400, detail="Invalid sort_by")
    query = build_bond_query(min_yield, max_yield, rating, bond_type, maturity_before, maturity_after)
    sort_dir = 1 if sort_order == "asc" else -1
    total = await db.bonds.count_documents(query)
    skip = (page - 1) * page_size
    bonds = await db.bonds.find(query, {"_id": 0}).sort(sort_by, sort_dir).skip(skip).limit(page_size).to_list(page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return {
        "bonds": bonds,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@api_router.get("/bonds/export")
async def export_bonds_csv(
    min_yield: Optional[float] = None,
    max_yield: Optional[float] = None,
    rating: Optional[str] = None,
    bond_type: Optional[str] = None,
    maturity_before: Optional[str] = None,
    maturity_after: Optional[str] = None,
):
    query = build_bond_query(min_yield, max_yield, rating, bond_type, maturity_before, maturity_after)
    bonds = await db.bonds.find(query, {"_id": 0}).sort("name", 1).to_list(1000)
    output = io.StringIO()
    fieldnames = ["name", "isin", "yield_pct", "maturity_date", "credit_rating", "bond_type", "price", "coupon", "change_1d"]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for bond in bonds:
        writer.writerow(bond)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=yielddesk_bonds_export.csv"},
    )


# ─── App Configuration ──────────────────────────────────────────────
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
