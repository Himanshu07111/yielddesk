import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Chart from "react-apexcharts";
import { X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const ratingBadgeColor = (r) => {
  if (["AAA", "AA"].includes(r)) return "border-[#00d4aa]/50 text-[#00d4aa]";
  if (["A", "BBB"].includes(r)) return "border-yellow-500/50 text-yellow-400";
  return "border-[#ff4757]/50 text-[#ff4757]";
};

const typeColor = (t) =>
  ({
    Government: "border-cyan-500/50 text-cyan-400",
    Corporate: "border-purple-500/50 text-purple-400",
    Municipal: "border-amber-500/50 text-amber-400",
  })[t] || "border-zinc-500/50 text-zinc-400";

const BondDetailModal = ({ bond, isOpen, onClose }) => {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const yearsToMaturity = useMemo(() => {
    if (!bond) return 0;
    return Math.max(0, (new Date(bond.maturity_date) - new Date()) / (365.25 * 24 * 60 * 60 * 1000));
  }, [bond]);

  const timeToMaturity = useMemo(() => {
    if (!bond) return "";
    const totalMonths = Math.round(yearsToMaturity * 12);
    if (totalMonths <= 0) return "Matured";
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    return `${y}y ${m}m`;
  }, [bond, yearsToMaturity]);

  const duration = useMemo(() => {
    if (!bond) return "0.00";
    return Math.max(0.5, yearsToMaturity * 0.88 - (bond.coupon / 100) * yearsToMaturity * 0.15).toFixed(2);
  }, [bond, yearsToMaturity]);

  const sparklineData = useMemo(() => {
    if (!bond) return [];
    const data = [];
    let val = bond.yield_pct + (Math.random() - 0.5) * 0.4;
    for (let i = 0; i < 12; i++) {
      val += (Math.random() - 0.5) * 0.2;
      val = Math.max(0.1, val);
      data.push(parseFloat(val.toFixed(3)));
    }
    data[11] = bond.yield_pct;
    return data;
  }, [bond]);

  const insights = useMemo(() => {
    if (!bond) return [];
    const pills = [];
    if (["AAA", "AA", "A"].includes(bond.credit_rating)) pills.push("High Grade");
    if (yearsToMaturity < 2) pills.push("Near Maturity");
    if (bond.yield_pct > 5) pills.push("High Yield");
    if (yearsToMaturity > 10) pills.push("Long Duration");
    if (["AAA", "AA", "A", "BBB"].includes(bond.credit_rating)) pills.push("Investment Grade");
    return pills;
  }, [bond, yearsToMaturity]);

  const chartOptions = {
    chart: { type: "area", sparkline: { enabled: true }, background: "transparent" },
    colors: ["#FFA500"],
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] } },
    tooltip: {
      enabled: true,
      theme: "dark",
      x: { show: false },
      y: { formatter: (val) => val.toFixed(3) + "%" },
    },
  };

  if (!bond) return null;

  const metrics = [
    { label: "CURRENT YIELD", value: `${bond.yield_pct.toFixed(2)}%`, color: "text-[#00d4aa]" },
    { label: "PRICE", value: bond.price.toFixed(2), color: "text-white" },
    { label: "MATURITY DATE", value: bond.maturity_date, color: "text-zinc-300" },
    { label: "TIME TO MATURITY", value: timeToMaturity, color: "text-zinc-300" },
    { label: "COUPON RATE", value: `${bond.coupon.toFixed(3)}%`, color: "text-zinc-300" },
    { label: "DURATION", value: `${duration} yrs`, color: "text-zinc-300" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-black/70" onClick={onClose} data-testid="modal-overlay" />
          <motion.div
            className="relative w-full max-w-[560px] border border-[#1e2a40] bg-[#0a0e1a] z-10"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            data-testid="bond-detail-modal"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-3 right-3 text-zinc-500 hover:text-white z-10"
              data-testid="modal-close-btn"
            >
              <X size={18} />
            </Button>
            <div className="p-5">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white tracking-tight" data-testid="modal-bond-name">{bond.name}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="font-mono text-xs text-zinc-500">{bond.isin}</span>
                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-mono font-medium border ${typeColor(bond.bond_type)}`}>
                    {bond.bond_type}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-mono font-medium border ${ratingBadgeColor(bond.credit_rating)}`}>
                    {bond.credit_rating}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px bg-[#1e2a40] border border-[#1e2a40] mb-4">
                {metrics.map((m) => (
                  <div key={m.label} className="bg-[#0a0e1a] p-3" data-testid={`modal-metric-${m.label.toLowerCase().replace(/\s/g, "-")}`}>
                    <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">{m.label}</div>
                    <div className={`font-mono text-sm font-bold ${m.color}`}>{m.value}</div>
                  </div>
                ))}
              </div>
              <div className="border border-[#1e2a40] bg-[#1a2035] p-3 mb-4" data-testid="modal-sparkline">
                <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">12-MONTH YIELD HISTORY</div>
                <Chart options={chartOptions} series={[{ data: sparklineData }]} type="area" height={80} />
              </div>
              {insights.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4" data-testid="modal-insights">
                  {insights.map((pill) => (
                    <span
                      key={pill}
                      className="text-[10px] font-mono font-medium px-2 py-0.5 border border-[#FFA500]/40 text-[#FFA500] bg-[#FFA500]/5"
                      data-testid={`insight-${pill.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={onClose}
                  className="bg-transparent border border-[#1e2a40] text-zinc-400 hover:text-white hover:bg-[#1a2035] text-xs"
                  data-testid="modal-close-footer-btn"
                >
                  CLOSE
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BondDetailModal;
