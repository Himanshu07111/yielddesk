import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { format } from "date-fns";
import {
  CaretUp,
  CaretDown,
  Export,
  Funnel,
  X,
  CalendarBlank,
} from "@phosphor-icons/react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RangeSlider } from "@/components/ui/range-slider";
import BondDetailModal from "@/components/BondDetailModal";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const RATINGS = ["AAA", "AA", "A", "BBB", "BB"];
const BOND_TYPES = ["Government", "Corporate", "Municipal"];

const COLUMNS = [
  { key: "name", label: "NAME", align: "left" },
  { key: "isin", label: "ISIN", align: "left" },
  { key: "yield_pct", label: "YIELD", align: "right" },
  { key: "coupon", label: "COUPON", align: "right" },
  { key: "price", label: "PRICE", align: "right" },
  { key: "change_1d", label: "CHG 1D", align: "right" },
  { key: "maturity_date", label: "MATURITY", align: "left" },
  { key: "credit_rating", label: "RATING", align: "center" },
  { key: "bond_type", label: "TYPE", align: "center" },
];

const ratingColor = (r) => {
  const m = {
    AAA: "border-emerald-500/50 text-emerald-400",
    AA: "border-green-500/50 text-green-400",
    A: "border-blue-500/50 text-blue-400",
    BBB: "border-yellow-500/50 text-yellow-400",
    BB: "border-red-500/50 text-red-400",
  };
  return m[r] || "border-zinc-500/50 text-zinc-400";
};

const typeColor = (t) => {
  const m = {
    Government: "border-cyan-500/50 text-cyan-400",
    Corporate: "border-purple-500/50 text-purple-400",
    Municipal: "border-amber-500/50 text-amber-400",
  };
  return m[t] || "border-zinc-500/50 text-zinc-400";
};

const BondScreener = () => {
  const [bonds, setBonds] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [loading, setLoading] = useState(true);
  const pageSize = 10;

  const [selectedBond, setSelectedBond] = useState(null);

  const [yieldRange, setYieldRange] = useState([0, 10]);
  const [selectedRatings, setSelectedRatings] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [maturityBefore, setMaturityBefore] = useState(null);

  const fetchBonds = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (yieldRange[0] > 0) params.min_yield = yieldRange[0];
      if (yieldRange[1] < 10) params.max_yield = yieldRange[1];
      if (selectedRatings.length)
        params.rating = selectedRatings.join(",");
      if (selectedTypes.length)
        params.bond_type = selectedTypes.join(",");
      if (maturityBefore)
        params.maturity_before = format(maturityBefore, "yyyy-MM-dd");

      const res = await axios.get(`${API}/bonds`, { params });
      setBonds(res.data.bonds);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      console.error("Failed to fetch bonds", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, yieldRange, selectedRatings, selectedTypes, maturityBefore]);

  useEffect(() => {
    fetchBonds();
  }, [fetchBonds]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (yieldRange[0] > 0) params.set("min_yield", yieldRange[0]);
    if (yieldRange[1] < 10) params.set("max_yield", yieldRange[1]);
    if (selectedRatings.length)
      params.set("rating", selectedRatings.join(","));
    if (selectedTypes.length)
      params.set("bond_type", selectedTypes.join(","));
    if (maturityBefore)
      params.set("maturity_before", format(maturityBefore, "yyyy-MM-dd"));
    window.open(`${API}/bonds/export?${params.toString()}`, "_blank");
  };

  const toggleRating = (rating) => {
    setSelectedRatings((prev) =>
      prev.includes(rating)
        ? prev.filter((r) => r !== rating)
        : [...prev, rating]
    );
    setPage(1);
  };

  const toggleType = (type) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setYieldRange([0, 10]);
    setSelectedRatings([]);
    setSelectedTypes([]);
    setMaturityBefore(null);
    setPage(1);
  };

  const hasActiveFilters =
    yieldRange[0] > 0 ||
    yieldRange[1] < 10 ||
    selectedRatings.length > 0 ||
    selectedTypes.length > 0 ||
    maturityBefore;

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return null;
    return sortOrder === "asc" ? (
      <CaretUp size={10} weight="bold" />
    ) : (
      <CaretDown size={10} weight="bold" />
    );
  };

  const alignClass = (a) =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <div className="p-4 md:p-6" data-testid="bond-screener-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight uppercase text-white">
            BOND SCREENER
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            {total} instrument{total !== 1 ? "s" : ""} found
          </p>
        </div>
        <Button
          onClick={handleExport}
          className="bg-[#FFA500] text-black hover:bg-[#FFB732] font-bold text-xs"
          data-testid="export-csv-btn"
        >
          <Export size={14} weight="bold" />
          EXPORT CSV
        </Button>
      </div>

      {/* Filter Bar */}
      <div
        className="border border-[#1e2a40] bg-[#1a2035] p-3 mb-4 flex flex-wrap items-end gap-4"
        data-testid="filter-panel"
      >
        {/* Yield Range */}
        <div className="min-w-[200px] flex-1">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 block font-mono">
            YIELD: {yieldRange[0].toFixed(1)}% &ndash; {yieldRange[1].toFixed(1)}%
          </label>
          <RangeSlider
            value={yieldRange}
            onValueChange={(v) => {
              setYieldRange(v);
              setPage(1);
            }}
            min={0}
            max={10}
            step={0.1}
            data-testid="yield-slider"
          />
        </div>

        {/* Rating Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-[#1a2035] border-[#1e2a40] text-xs h-8"
              data-testid="rating-filter-btn"
            >
              <Funnel size={12} />
              RATING{" "}
              {selectedRatings.length > 0 && `(${selectedRatings.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1a2035] border-[#1e2a40]">
            {RATINGS.map((r) => (
              <DropdownMenuCheckboxItem
                key={r}
                checked={selectedRatings.includes(r)}
                onCheckedChange={() => toggleRating(r)}
                data-testid={`rating-option-${r}`}
              >
                {r}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Type Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-[#1a2035] border-[#1e2a40] text-xs h-8"
              data-testid="type-filter-btn"
            >
              <Funnel size={12} />
              TYPE{" "}
              {selectedTypes.length > 0 && `(${selectedTypes.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1a2035] border-[#1e2a40]">
            {BOND_TYPES.map((t) => (
              <DropdownMenuCheckboxItem
                key={t}
                checked={selectedTypes.includes(t)}
                onCheckedChange={() => toggleType(t)}
                data-testid={`type-option-${t.toLowerCase()}`}
              >
                {t}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Maturity Before */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="bg-[#1a2035] border-[#1e2a40] text-xs h-8"
              data-testid="maturity-filter-btn"
            >
              <CalendarBlank size={12} />
              {maturityBefore
                ? format(maturityBefore, "yyyy-MM-dd")
                : "MATURITY BEFORE"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-[#1a2035] border-[#1e2a40]">
            <Calendar
              mode="single"
              selected={maturityBefore}
              onSelect={(date) => {
                setMaturityBefore(date);
                setPage(1);
              }}
              data-testid="maturity-calendar"
            />
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-zinc-500 hover:text-white text-xs h-8"
            data-testid="clear-filters-btn"
          >
            <X size={12} />
            CLEAR
          </Button>
        )}
      </div>

      {/* Table */}
      <div
        className="border border-[#1e2a40] bg-[#1a2035] overflow-x-auto"
        data-testid="bonds-table"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#1e2a40] hover:bg-transparent">
              {COLUMNS.map((col) => (
                <TableHead
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`text-[10px] uppercase tracking-wider text-zinc-600 bg-[#1a2035] cursor-pointer select-none hover:text-zinc-300 ${alignClass(
                    col.align
                  )} whitespace-nowrap`}
                  data-testid={`sort-${col.key}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon column={col.key} />
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? [...Array(5)].map((_, i) => (
                  <TableRow key={i} className="border-b border-[#1e2a40]">
                    {[...Array(9)].map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-[#111827] animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : bonds.length === 0
              ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-zinc-500 py-12 font-mono text-sm"
                  >
                    No bonds match current filters
                  </TableCell>
                </TableRow>
              )
              : bonds.map((bond) => (
                  <TableRow
                    key={bond.id}
                    className="border-b border-[#1e2a40] hover:bg-[#111827]/50 cursor-pointer"
                    data-testid={`bond-row-${bond.id}`}
                    onClick={() => setSelectedBond(bond)}
                  >
                    <TableCell className="font-medium text-white text-sm whitespace-nowrap">
                      {bond.name}
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-zinc-500 whitespace-nowrap">
                      {bond.isin}
                    </TableCell>
                    <TableCell className="font-mono text-[13px] font-medium text-right text-[#00d4aa]">
                      {bond.yield_pct.toFixed(2)}%
                    </TableCell>
                    <TableCell className="font-mono text-[13px] text-right text-zinc-300">
                      {bond.coupon.toFixed(3)}%
                    </TableCell>
                    <TableCell className="font-mono text-[13px] text-right text-zinc-300">
                      {bond.price.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={`font-mono text-[13px] font-medium text-right ${
                        bond.change_1d > 0
                          ? "text-[#00d4aa]"
                          : bond.change_1d < 0
                          ? "text-[#ff4757]"
                          : "text-zinc-500"
                      }`}
                    >
                      {bond.change_1d > 0 ? "+" : ""}
                      {bond.change_1d.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-mono text-[12px] text-zinc-400 whitespace-nowrap">
                      {bond.maturity_date}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 text-[10px] font-mono font-medium border ${ratingColor(
                          bond.credit_rating
                        )}`}
                      >
                        {bond.credit_rating}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 text-[10px] font-mono font-medium border ${typeColor(
                          bond.bond_type
                        )}`}
                      >
                        {bond.bond_type}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div
        className="flex items-center justify-between mt-3"
        data-testid="pagination"
      >
        <span className="text-[11px] text-zinc-600 font-mono">
          PAGE {page}/{totalPages} &middot; {total} TOTAL
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="bg-transparent border-[#1e2a40] text-zinc-500 hover:text-white text-[10px] h-7 px-2 disabled:opacity-30"
            data-testid="prev-page-btn"
          >
            PREV
          </Button>
          {[...Array(totalPages)].map((_, i) => (
            <Button
              key={i + 1}
              variant={page === i + 1 ? "default" : "outline"}
              size="sm"
              onClick={() => setPage(i + 1)}
              className={`h-7 w-7 p-0 text-[10px] ${
                page === i + 1
                  ? "bg-[#FFA500] text-black font-bold border-[#FFA500]"
                  : "bg-transparent border-[#1e2a40] text-zinc-500 hover:text-white"
              }`}
              data-testid={`page-${i + 1}-btn`}
            >
              {i + 1}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="bg-transparent border-[#1e2a40] text-zinc-500 hover:text-white text-[10px] h-7 px-2 disabled:opacity-30"
            data-testid="next-page-btn"
          >
            NEXT
          </Button>
        </div>
      </div>

      <BondDetailModal
        bond={selectedBond}
        isOpen={!!selectedBond}
        onClose={() => setSelectedBond(null)}
      />
    </div>
  );
};

export default BondScreener;
