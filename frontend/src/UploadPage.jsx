// src/UploadPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000/api/uploads/";

export default function UploadPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState("CV");
  const [title, setTitle] = useState("");

  // Project-specific
  const [projectUrl, setProjectUrl] = useState("");
  const [projectDesc, setProjectDesc] = useState("");

  const [uploading, setUploading] = useState(false);

  async function fetchList() {
    setLoading(true);
    setErr("");
    try {
      const res = await axios.get(API);
      setItems(Array.isArray(res.data) ? res.data : (res.data?.results || []));
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); }, []);

  const handleUpload = async () => {
    try {
      setErr("");
      setUploading(true);

      if (docType === "PROJECT") {
        // JSON-only path (file optional)
        const body = {
          doc_type: "PROJECT",
          title: (title || "").trim(),
          external_url: (projectUrl || "").trim(),
          description: (projectDesc || "").trim(),
        };
        if (!body.external_url) {
          setErr("Please enter the GitHub URL for the project.");
          setUploading(false);
          return;
        }
        // Try canonical endpoint first
        const endpoints = [API, "http://127.0.0.1:8000/api/documents/"];
        let created = null;
        for (const ep of endpoints) {
          try {
            const res = await axios.post(ep, body, { headers: { "Content-Type": "application/json" } });
            created = res.data;
            break;
          } catch (_) {}
        }
        if (!created) throw new Error("Could not create project. Check API routes/serializer.");
        await fetchList();
        setTitle(""); setProjectUrl(""); setProjectDesc(""); setFile(null);
        setUploading(false);
        return;
      }

      // Regular file upload path
      if (!file) {
        setErr("Choose a file to upload.");
        setUploading(false);
        return;
      }
      const form = new FormData();
      form.append("file", file);
      form.append("doc_type", docType);
      if (title.trim()) form.append("title", title.trim());
      const endpoints = [API, "http://127.0.0.1:8000/api/documents/"];
      let ok = false;
      for (const ep of endpoints) {
        try {
          await axios.post(ep, form, { headers: { "Content-Type": "multipart/form-data" } });
          ok = true; break;
        } catch (_) {}
      }
      if (!ok) throw new Error("Upload failed. Check API routes/permissions.");
      await fetchList();
      setFile(null); setTitle("");
      setUploading(false);
    } catch (e) {
      setUploading(false);
      setErr(e?.response?.data?.detail || e.message || "Failed to upload");
    }
  };

  const handleDelete = async (id) => {
    try {
      const endpoints = [`${API}${id}/`, `http://127.0.0.1:8000/api/documents/${id}/`];
      let ok = false;
      for (const ep of endpoints) {
        try { await axios.delete(ep); ok = true; break; } catch (_) {}
      }
      if (ok) setItems((arr) => arr.filter((x) => x.id !== id));
    } catch (e) {}
  };

  const shell = { minHeight: "100vh", background: "#0f172a", color: "#f1f5f9" };
  const wrap = { maxWidth: 980, margin: "0 auto", padding: "28px 16px" };
  const card = { background: "#1e293b", border: "1px solid #334155", borderRadius: 18, padding: 18 };

  const input = {
    padding: "10px 12px", borderRadius: 10, border: "1px solid #334155",
    background: "#0b1220", color: "#e5e7eb"
  };
  const btn = {
    border: 0, borderRadius: 12, padding: "10px 14px", fontWeight: 800, cursor: "pointer",
    background: "linear-gradient(90deg,#8b5cf6,#6366f1)", color: "#fff",
    boxShadow: "0 6px 16px rgba(139,92,246,.35)"
  };

  return (
    <div style={shell}>
      <div style={wrap}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: "radial-gradient(circle at 30% 30%, #8b5cf6, #7c3aed)", boxShadow: "0 0 8px rgba(139,92,246,.8)" }} />
            <strong>Step 1 · Upload documents</strong>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="/portfolio" style={{ color: "#c7d2fe" }}>Portfolio</a>
          </div>
        </div>

        <section style={card}>
          <h1 style={{ marginTop: 0 }}>Upload Document</h1>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            {/* File picker (disabled for Project unless you want an asset) */}
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ ...input, padding: 8 }}
              disabled={docType === "PROJECT"}
            />

            <select value={docType} onChange={(e) => setDocType(e.target.value)} style={input}>
              <option value="CV">CV / Résumé</option>
              <option value="CERTIFICATE">Certificate</option>
              <option value="RECOMMENDATION">Recommendation</option>
              <option value="PROFILE_IMAGE">Profile Image</option>
              <option value="PROJECT">Project</option>
            </select>

            <button onClick={handleUpload} disabled={uploading} style={btn}>
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>

          {/* Optional display name for all types */}
          <div style={{ marginBottom: 10 }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Display name (button/card title)"
              style={{ ...input, width: 360 }}
            />
          </div>

          {/* Project-only inputs */}
          {docType === "PROJECT" && (
            <div style={{ display: "grid", gap: 10, marginBottom: 10 }}>
              <input
                value={projectUrl}
                onChange={(e) => setProjectUrl(e.target.value)}
                placeholder="GitHub URL (https://github.com/you/repo)"
                style={input}
              />
              <textarea
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                rows={3}
                placeholder="Short project description"
                style={{ ...input, resize: "vertical" }}
              />
            </div>
          )}

          {err && <div style={{ marginTop: 8, color: "#fecaca" }}>{err}</div>}
        </section>

        <section style={{ ...card, marginTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 8, color: "#cbd5e1", marginBottom: 8 }}>
            <div>Name</div><div>Type</div><div>Size</div><div>Action</div>
          </div>

          {loading ? (
            <div style={{ color: "#94a3b8" }}>Loading…</div>
          ) : (
            items.map((d) => (
              <div key={d.id} style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto auto",
                gap: 8,
                alignItems: "center",
                padding: "10px 0",
                borderTop: "1px solid #334155"
              }}>
                <a href={d.file || d.external_url} target="_blank" rel="noreferrer" style={{ color: "#c7d2fe", textDecoration: "none" }}>
                  {d.title || d.original_name || `Item #${d.id}`}
                </a>
                <div style={{ color: "#94a3b8" }}>{d.doc_type}</div>
                <div style={{ color: "#94a3b8" }}>{d.size_bytes ? `${(d.size_bytes/1024/1024).toFixed(2)} MB` : "-"}</div>
                <div>
                  <button onClick={() => handleDelete(d.id)} style={btn}>Delete</button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
