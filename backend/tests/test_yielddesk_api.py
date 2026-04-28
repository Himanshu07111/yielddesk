"""Backend API tests for YieldDesk."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "http://localhost:8001"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ─── Root ─────────────────────────────────────────────────
class TestRoot:
    def test_root(self, client):
        r = client.get(f"{API}/")
        assert r.status_code == 200
        assert "message" in r.json()


# ─── Yield Curve ──────────────────────────────────────────
class TestYieldCurve:
    def test_yield_curve_structure(self, client):
        r = client.get(f"{API}/yield-curve")
        assert r.status_code == 200
        data = r.json()
        assert "date" in data
        assert "last_updated" in data
        assert "curve" in data
        assert len(data["curve"]) == 9
        expected_tenors = ["1M", "3M", "6M", "1Y", "2Y", "5Y", "10Y", "20Y", "30Y"]
        tenors = [p["tenor"] for p in data["curve"]]
        assert tenors == expected_tenors
        for p in data["curve"]:
            assert "yield_pct" in p
            assert isinstance(p["yield_pct"], (int, float))
            assert 0 < p["yield_pct"] < 10
        # new: source field ('live' or 'mock')
        assert "source" in data
        assert data["source"] in ("live", "mock")


# ─── Bonds listing ───────────────────────────────────────
class TestBonds:
    def test_default_pagination(self, client):
        r = client.get(f"{API}/bonds")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 25
        assert data["page"] == 1
        assert data["page_size"] == 10
        assert data["total_pages"] == 3
        assert len(data["bonds"]) == 10
        # verify no _id leaks through
        for b in data["bonds"]:
            assert "_id" not in b
            assert "name" in b and "yield_pct" in b

    def test_page_2(self, client):
        r = client.get(f"{API}/bonds", params={"page": 2})
        assert r.status_code == 200
        data = r.json()
        assert data["page"] == 2
        assert len(data["bonds"]) == 10

    def test_page_3(self, client):
        r = client.get(f"{API}/bonds", params={"page": 3})
        assert r.status_code == 200
        data = r.json()
        assert data["page"] == 3
        assert len(data["bonds"]) == 5

    def test_sort_yield_desc(self, client):
        r = client.get(f"{API}/bonds", params={"sort_by": "yield_pct", "sort_order": "desc", "page_size": 25})
        assert r.status_code == 200
        yields = [b["yield_pct"] for b in r.json()["bonds"]]
        assert yields == sorted(yields, reverse=True)

    def test_sort_name_asc(self, client):
        r = client.get(f"{API}/bonds", params={"sort_by": "name", "sort_order": "asc", "page_size": 25})
        assert r.status_code == 200
        names = [b["name"] for b in r.json()["bonds"]]
        assert names == sorted(names)

    def test_filter_min_yield(self, client):
        r = client.get(f"{API}/bonds", params={"min_yield": 5.0, "page_size": 25})
        assert r.status_code == 200
        for b in r.json()["bonds"]:
            assert b["yield_pct"] >= 5.0

    def test_filter_max_yield(self, client):
        r = client.get(f"{API}/bonds", params={"max_yield": 3.0, "page_size": 25})
        assert r.status_code == 200
        for b in r.json()["bonds"]:
            assert b["yield_pct"] <= 3.0

    def test_filter_rating(self, client):
        r = client.get(f"{API}/bonds", params={"rating": "AAA", "page_size": 25})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] > 0
        for b in data["bonds"]:
            assert b["credit_rating"] == "AAA"

    def test_filter_multi_rating(self, client):
        r = client.get(f"{API}/bonds", params={"rating": "AAA,BB", "page_size": 25})
        assert r.status_code == 200
        for b in r.json()["bonds"]:
            assert b["credit_rating"] in ["AAA", "BB"]

    def test_filter_bond_type(self, client):
        r = client.get(f"{API}/bonds", params={"bond_type": "Corporate", "page_size": 25})
        assert r.status_code == 200
        for b in r.json()["bonds"]:
            assert b["bond_type"] == "Corporate"

    def test_filter_maturity_before(self, client):
        r = client.get(f"{API}/bonds", params={"maturity_before": "2029-01-01", "page_size": 25})
        assert r.status_code == 200
        for b in r.json()["bonds"]:
            assert b["maturity_date"] <= "2029-01-01"

    def test_combined_filters(self, client):
        r = client.get(f"{API}/bonds", params={
            "min_yield": 4.0, "max_yield": 5.0,
            "rating": "AAA,AA", "bond_type": "Government", "page_size": 25
        })
        assert r.status_code == 200
        for b in r.json()["bonds"]:
            assert 4.0 <= b["yield_pct"] <= 5.0
            assert b["credit_rating"] in ["AAA", "AA"]
            assert b["bond_type"] == "Government"


# ─── CSV Export ──────────────────────────────────────────
class TestExport:
    def test_export_csv(self, client):
        r = client.get(f"{API}/bonds/export")
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        assert "attachment" in r.headers.get("content-disposition", "")
        body = r.text
        assert "name,isin,yield_pct" in body.splitlines()[0]
        # 25 rows + header
        assert len(body.strip().splitlines()) == 26

    def test_export_filtered(self, client):
        r = client.get(f"{API}/bonds/export", params={"bond_type": "Municipal"})
        assert r.status_code == 200
        lines = r.text.strip().splitlines()
        # 7 municipal bonds + header
        assert len(lines) == 8
        for line in lines[1:]:
            assert "Municipal" in line
