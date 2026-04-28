import { useState, useEffect, useCallback } from "react";
import Chart from "react-apexcharts";
import axios from "axios";
import { Clock, CalendarBlank, ArrowsClockwise } from "@phosphor-icons/react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MetricCard = ({ label, value, format = "pct" }) => {
  const isNeg = value < 0;
  let displayVal;
  if (format === "bps") {
    displayVal = `${isNeg ? "" : "+"}${(value * 100).toFixed(1)} bps`;
  } else {
    displayVal = `${value.toFixed(2)}%`;
  }

  return (
    <div
      className="border border-[#1e2a40] bg-[#1a2035] p-3"
      data-testid={`metric-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div
        className={`text-lg font-mono font-bold ${
          isNeg ? "text-[#ff4757]" : "text-[#00d4aa]"
        }`}
      >
        {displayVal}
      </div>
    </div>
  );
};

const YieldCurve = () => {
  const [curveData, setCurveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/yield-curve`);
      setCurveData(res.data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch yield curve data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4" data-testid="yield-curve-loading">
        <div className="h-8 w-64 bg-[#111827] animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-[#111827] animate-pulse" />
          ))}
        </div>
        <div className="h-[420px] bg-[#111827] animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-6 flex items-center justify-center h-[400px]"
        data-testid="yield-curve-error"
      >
        <div className="text-[#ff4757] font-mono text-sm">{error}</div>
      </div>
    );
  }

  const tenors = curveData.curve.map((p) => p.tenor);
  const yields = curveData.curve.map((p) => p.yield_pct);

  const y2 = curveData.curve.find((p) => p.tenor === "2Y")?.yield_pct || 0;
  const y10 = curveData.curve.find((p) => p.tenor === "10Y")?.yield_pct || 0;
  const y30 = curveData.curve.find((p) => p.tenor === "30Y")?.yield_pct || 0;
  const spread2s10s = y10 - y2;

  const chartOptions = {
    chart: {
      type: "line",
      background: "transparent",
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "IBM Plex Sans, sans-serif",
    },
    colors: ["#FFA500"],
    stroke: { curve: "smooth", width: 3 },
    markers: {
      size: 5,
      colors: ["#0a0e1a"],
      strokeColors: "#FFA500",
      strokeWidth: 2,
      hover: { size: 7 },
    },
    grid: {
      borderColor: "#1e2a40",
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    xaxis: {
      categories: tenors,
      labels: {
        style: {
          colors: "#A1A1AA",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "11px",
        },
      },
      axisBorder: { color: "#1e2a40" },
      axisTicks: { color: "#1e2a40" },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#A1A1AA",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "11px",
        },
        formatter: (val) => val.toFixed(2) + "%",
      },
    },
    tooltip: {
      theme: "dark",
      style: { fontFamily: "JetBrains Mono, monospace" },
      y: { formatter: (val) => val.toFixed(3) + "%" },
    },
    dataLabels: { enabled: false },
  };

  const series = [{ name: "Yield", data: yields }];

  return (
    <div className="p-4 md:p-6" data-testid="yield-curve-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight uppercase text-white">
            US TREASURY YIELD CURVE
          </h1>
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 font-mono">
            <span className="flex items-center gap-1">
              <CalendarBlank size={12} />
              {curveData.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {new Date(curveData.last_updated).toLocaleTimeString("en-US", {
                timeZone: "America/New_York",
                hour12: false,
              })}{" "}
              EST
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {curveData.source === "live" ? (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-[#00d4aa]/50 text-[#00d4aa] bg-[#00d4aa]/10" data-testid="data-source-badge">
              LIVE DATA
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 border border-[#FFA500]/50 text-[#FFA500] bg-[#FFA500]/10" data-testid="data-source-badge">
              MOCK DATA
            </span>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-mono" data-testid="auto-refresh-indicator">
            <ArrowsClockwise size={12} className="text-zinc-600" />
            AUTO-REFRESH 60S
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <MetricCard label="2Y YIELD" value={y2} />
        <MetricCard label="10Y YIELD" value={y10} />
        <MetricCard label="2s10s SPREAD" value={spread2s10s} format="bps" />
        <MetricCard label="30Y YIELD" value={y30} />
      </div>

      {/* Chart */}
      <div
        className="border border-[#1e2a40] bg-[#1a2035] p-4"
        data-testid="yield-curve-chart"
      >
        <Chart options={chartOptions} series={series} type="line" height={420} />
      </div>

      {/* Data Grid */}
      <div
        className="mt-3 border border-[#1e2a40] bg-[#1a2035] overflow-hidden"
        data-testid="yield-data-table"
      >
        <div className="grid grid-cols-9 text-[10px] uppercase tracking-wider text-zinc-600 border-b border-[#1e2a40]">
          {tenors.map((t) => (
            <div key={t} className="px-2 py-1.5 text-center font-mono">
              {t}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-9">
          {curveData.curve.map((p) => (
            <div
              key={p.tenor}
              className="px-2 py-2 text-center font-mono text-[13px] font-medium text-[#FFA500]"
            >
              {p.yield_pct.toFixed(3)}%
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default YieldCurve;
