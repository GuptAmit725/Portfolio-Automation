// src/ProjectsSection.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000/api";

export default function ProjectsSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");

  async function fetchProjects() {
    setLoading(true);
    setErr("");
    const urls = [
      `${API_BASE}/uploads/?doc_type=PROJECT`,
      `${API_BASE}/documents/?doc_type=PROJECT`,
    ];
    for (const u of urls) {
      try {
        const res = await axios.get(u);
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.results)
          ? res.data.results
          : null;
        if (!list) continue;
        const filtered = list.filter(
          (d) => (d.doc_type || "").toUpperCase().trim() === "PROJECT"
        );
        setItems(filtered);
        setLoading(false);
        return;
      } catch (e) {}
    }
    setLoading(false);
  }

  useEffect(() => { fetchProjects(); }, []);

  async function addProject(e) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    try {
      const body = {
        doc_type: "PROJECT",
        title: title.trim(),
        external_url: url.trim(),
        description: desc.trim(),
      };
      const endpoints = [`${API_BASE}/uploads/`, `${API_BASE}/documents/`];
      let created = null;
      for (const ep of endpoints) {
        try {
          const res = await axios.post(ep, body, { headers: { "Content-Type": "application/json" } });
          created = res.data;
          break;
        } catch (_) {}
      }
      if (!created) throw new Error("Could not create project. Check API routes/serializer.");
      setItems((arr) => [created, ...arr]);
      setAdding(false); setTitle(""); setUrl(""); setDesc("");
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message || "Failed to add project");
    }
  }

  const shell = {
    marginTop: 24, marginBottom: 16, padding: 16,
    borderRadius: 12, border: "1px solid #1f2a44", background: "#0b1220",
  };
  const h2 = { margin: 0, marginBottom: 12, color: "#e5e7eb" };
  const grid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
    gap: 12,
  };
  const btn = {
    border: 0, borderRadius: 10, padding: "10px 12px",
    fontWeight: 800, cursor: "pointer",
    background: "linear-gradient(90deg,#8b5cf6,#6366f1)", color: "#fff",
    boxShadow: "0 6px 16px rgba(139,92,246,.35)"
  };

  return (
    <section style={shell}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h2 style={h2}>Projects</h2>
        {!adding ? (
          <button style={btn} onClick={() => setAdding(true)}>+ Add Project</button>
        ) : (
          <button style={{ ...btn, background: "linear-gradient(90deg,#64748b,#475569)" }}
                  onClick={() => setAdding(false)}>Cancel</button>
        )}
      </div>

      {adding && (
        <form onSubmit={addProject} style={{
          display: "grid", gap: 10, marginBottom: 14,
          background: "#0f172a", border: "1px solid #1f2a44", padding: 12, borderRadius: 12
        }}>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Project title (shown on card)"
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #334155", background: "#0b1220", color: "#e5e7eb" }}
          />
          <input
            value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="GitHub URL (https://github.com/you/repo)"
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #334155", background: "#0b1220", color: "#e5e7eb" }}
          />
          <textarea
            value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Short description"
            rows={3}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #334155", background: "#0b1220", color: "#e5e7eb", resize: "vertical" }}
          />
          <div>
            <button style={btn} type="submit">Save Project</button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ color: "#94a3b8" }}>Loading…</div>
      ) : err ? (
        <div style={{ color: "#fecaca" }}>{err}</div>
      ) : items.length === 0 ? (
        <div style={{ color: "#94a3b8" }}>No projects yet. Use “+ Add Project”.</div>
      ) : (
        <div style={grid}>
          {items.map((p) => {
            const title = p.title || "Untitled Project";
            const url = p.external_url || "#";
            const desc = p.description || "";
            const file = p.file; // optional screenshot/asset
            return (
              <article key={p.id} style={{
                background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 12
              }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
                <p style={{ margin: 0, color: "#cbd5e1", minHeight: 42 }}>{desc}</p>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {url && url !== "#" && (
                    <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                      <button style={btn} title="View on GitHub">GitHub</button>
                    </a>
                  )}
                  {file && (
                    <a href={file} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                      <button style={{ ...btn, background: "linear-gradient(90deg,#7c3aed,#6d28d9)" }}>
                        Open Asset
                      </button>
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
