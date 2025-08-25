// src/App.js
// Requires: react-router-dom → run: npm i react-router-dom
import React from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import PortfolioPage from "./PortfolioPage";
import UploadPage from "./UploadPage";

function NavBar() {
  const base = "px-3 py-2 rounded-lg font-semibold";
  const active = { background: "#1e293b", color: "#fff" };
  const inactive = { color: "#cbd5e1" };

  return (
    <header style={{ background: "#0f172a", borderBottom: "1px solid #1f2937" }}>
      <div style={{
        maxWidth: 1100, margin: "0 auto", padding: "12px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between", color: "#f1f5f9"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: 999,
            background: "radial-gradient(circle at 30% 30%, #8b5cf6, #7c3aed)",
            boxShadow: "0 0 8px rgba(139,92,246,.8)"
          }}/>
          <strong>Portfolio Automation</strong>
        </div>
        <nav style={{ display: "flex", gap: 8 }}>
          <NavLink to="/upload" style={({isActive}) => (isActive ? active : inactive)} className={base}>
            Upload
          </NavLink>
          <NavLink to="/portfolio" style={({isActive}) => (isActive ? active : inactive)} className={base}>
            Portfolio
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9" }}>
      <BrowserRouter>
        <NavBar />
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
          <Routes>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="*" element={<Navigate to="/upload" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </div>
  );
}
