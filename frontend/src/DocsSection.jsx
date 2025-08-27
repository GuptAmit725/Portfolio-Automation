// src/DocsSection.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000/api";

/**
 * Labeled section of document buttons.
 * docType: "RECOMMENDATION" | "CERTIFICATE"
 * title: heading
 */
export default function DocsSection({ docType, title }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [renamingId, setRenamingId] = useState(null);
  const [newTitle, setNewTitle] = useState("");

  async function fetchDocs() {
    setLoading(true);
    const candidates = [
      `${API_BASE}/documents/?doc_type=${docType}`,
      `${API_BASE}/uploads/?doc_type=${docType}`,
    ];
    for (const url of candidates) {
      try {
        const res = await axios.get(url);
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.results)
          ? res.data.results
          : null;
        if (!list) continue;

        // strict client-side filter (some backends ignore query param)
        const filtered = list.filter(
          (d) => (d.doc_type || "").toUpperCase().trim() === docType.toUpperCase()
        );

        setDocs(filtered);
        setLoading(false);
        return;
      } catch (_) {}
    }
    setLoading(false);
  }

  useEffect(() => { fetchDocs(); /* eslint-disable-next-line */ }, [docType]);

  const startRename = (doc) => {
    setRenamingId(doc.id);
    setNewTitle(doc.title || "");
  };
  const cancelRename = () => {
    setRenamingId(null);
    setNewTitle("");
  };
  const saveRename = async (doc) => {
    const body = { title: newTitle.trim() };
    if (!body.title) return;
    const endpoints = [
      `${API_BASE}/documents/${doc.id}/`,
      `${API_BASE}/uploads/${doc.id}/`,
    ];
    for (const ep of endpoints) {
      try {
        await axios.patch(ep, body);
        setDocs((list) =>
          list.map((d) => (d.id === doc.id ? { ...d, title: body.title } : d))
        );
        break;
      } catch (_) {}
    }
    cancelRename();
  };

  const shell = {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    border: "1px solid #1f2a44",
    background: "#0b1220",
  };
  const h2 = { margin: 0, marginBottom: 12, color: "#e5e7eb" };
  const grid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
    gap: 12,
  };
  const btn = {
    border: 0,
    borderRadius: 10,
    padding: "10px 12px",
    fontWeight: 800,
    cursor: "pointer",
    textAlign: "center",
    background: "linear-gradient(90deg,#8b5cf6,#6366f1)",
    color: "#fff",
    boxShadow: "0 6px 16px rgba(139,92,246,.35)",
    width: "100%",
  };
  const meta = { fontSize: 12, color: "#94a3b8", marginTop: 6 };

  return (
    <section style={shell}>
      <h2 style={h2}>{title}</h2>
      {loading ? (
        <div style={{ color: "#94a3b8" }}>Loading…</div>
      ) : docs.length === 0 ? (
        <div style={{ color: "#94a3b8" }}>
          No items yet. Upload and provide a proper name—the same name will be shown on the button.
        </div>
      ) : (
        <div style={grid}>
          {docs.map((doc) => {
            const label = (doc.title && doc.title.trim()) || doc.original_name || `Item #${doc.id}`;
            const href = doc.file?.url || doc.file || doc.external_url;

            return (
              <div key={doc.id} style={{
                border: "1px solid #1f2a44",
                borderRadius: 12,
                padding: 12,
                background: "#0f172a",
              }}>
                {renamingId === doc.id ? (
                  <>
                    <input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Enter display name"
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid #334155",
                        background: "#0b1220",
                        color: "#e5e7eb",
                        marginBottom: 8,
                      }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={btn} onClick={() => saveRename(doc)}>Save</button>
                      <button
                        onClick={cancelRename}
                        style={{ ...btn, background: "linear-gradient(90deg,#64748b,#475569)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: "none", width: "100%", display: "block" }}>
                        <button style={btn} title={label}>{label}</button>
                      </a>
                    ) : (
                      <button style={{ ...btn, opacity: .7 }} title={label} disabled>{label}</button>
                    )}
                    <div style={meta}>
                      Type: {doc.doc_type} {doc.size_bytes ? `· Size: ${doc.size_bytes} bytes` : ""}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <button
                        onClick={() => startRename(doc)}
                        style={{ ...btn, background: "linear-gradient(90deg,#7c3aed,#6d28d9)" }}
                        title="Rename the button label"
                      >
                        Rename
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
