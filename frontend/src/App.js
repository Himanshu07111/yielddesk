import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import YieldCurve from "@/pages/YieldCurve";
import BondScreener from "@/pages/BondScreener";

function App() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <BrowserRouter>
        <Header />
        <main className="pt-[52px]">
          <Routes>
            <Route path="/" element={<YieldCurve />} />
            <Route path="/screener" element={<BondScreener />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </div>
  );
}

export default App;
