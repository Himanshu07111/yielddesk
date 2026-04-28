import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChartLine, Table } from "@phosphor-icons/react";

const Header = () => {
  const location = useLocation();
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { path: "/", label: "YIELD CURVE", icon: ChartLine },
    { path: "/screener", label: "BOND SCREENER", icon: Table },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-[52px] bg-[#0a0e1a] border-b border-[#1e2a40] flex items-center justify-between px-4 md:px-6"
      data-testid="main-header"
    >
      <div className="flex items-center gap-5">
        <Link to="/" className="text-lg font-bold tracking-tight" data-testid="app-logo">
          YIELD<span className="text-[#FFA500]">DESK</span>
        </Link>
        <nav className="flex items-center gap-0.5" data-testid="main-nav">
          {navLinks.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold tracking-wide ${
                location.pathname === path
                  ? "text-white border-b-2 border-[#FFA500]"
                  : "text-zinc-500 hover:text-zinc-200"
              }`}
            >
              <Icon size={15} weight="bold" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div
        className="font-mono text-sm text-[#00d4aa] border border-[#00d4aa]/30 bg-[#00d4aa]/5 px-3 py-1"
        data-testid="live-clock"
      >
        {time} EST
      </div>
    </header>
  );
};

export default Header;
