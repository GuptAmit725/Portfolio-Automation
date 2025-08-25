// src/PortfolioPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000/api/profile/generate/";

export default function PortfolioPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [profile, setProfile] = useState(null);

  const generate = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await axios.post(API);
      const p = (res.data && res.data.profile) || null;
      if (!p) throw new Error("No profile in response");
      setProfile(p);
      localStorage.setItem("portfolio_profile", JSON.stringify(p));
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.detail || e.message || "Failed to generate profile");
    } finally {
      setLoading(false);
    }
  };

  // Load cached profile if present
  useEffect(() => {
    const saved = localStorage.getItem("portfolio_profile");
    if (saved) {
      try { setProfile(JSON.parse(saved)); } catch {}
    }
  }, []);

  // Auto generate on first visit if no cache
  useEffect(() => {
    if (!profile && !loading) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#1f2850 0%, #0f172a 30%, #0f172a 100%)", color: "#f1f5f9" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 16px" }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: "radial-gradient(circle at 30% 30%, #8b5cf6, #7c3aed)", boxShadow: "0 0 8px rgba(139,92,246,.8)" }} />
            <strong>Step 2 · Portfolio Generator</strong>
          </div>
          <button onClick={generate} disabled={loading}
            style={{
              border: 0, borderRadius: 12, padding: "10px 14px", fontWeight: 800, cursor: "pointer",
              background: "linear-gradient(90deg,#8b5cf6,#6366f1)", color: "#fff",
              boxShadow: "0 6px 16px rgba(139,92,246,.35)", opacity: loading ? 0.8 : 1
            }}>
            {loading ? <Dots /> : "Regenerate"}
          </button>
        </div>

        {err && (
          <div style={{ marginBottom: 16, background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 12, color: "#fecaca" }}>
            {err}
          </div>
        )}

        {/* HEADER */}
        <Card>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div
            style={{
                width: 84,
                height: 84,
                borderRadius: "50%",
                background: "#111827",
                border: "3px solid #e5e7eb22",
                overflow: "hidden",
                flex: "0 0 auto"
            }}
            >
            {profile?.photo ? (
                <img
                src={profile.photo}
                alt="Profile"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            ) : (
                <span role="img" aria-label="avatar" style={{ fontSize: 38, display: "grid", placeItems: "center", height: "100%" }}>
                👤
                </span>
            )}
            </div>

            <div>
              <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.1 }}>{profile?.name || "Your Name"}</h1>
              <p style={{ margin: "6px 0 0", color: "#cbd5e1", fontSize: 18 }}>
                {profile?.title || "Job Title"}
              </p>
            </div>
          </div>
        </Card>

        {/* ABOUT */}
        {(profile?.summary?.trim?.()) && (
          <Card title="About" icon="💡">
            <p style={{ margin: 0, color: "#e5e7eb" }}>{profile.summary}</p>
          </Card>
        )}

        {/* SKILLS */}
        {Array.isArray(profile?.skills) && profile.skills.length > 0 && (
          <Card title="Skills" icon="🧰">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {profile.skills.map((s, i) => (
                <Chip key={i}>{s}</Chip>
              ))}
            </div>
          </Card>
        )}

        {/* EXPERIENCE */}
        {Array.isArray(profile?.experience) && profile.experience.length > 0 && (
          <Card title="Experience" icon="🧭">
            <div style={{ display: "grid", gap: 16 }}>
              {profile.experience.map((e, i) => (
                <TimelineItem
                  key={i}
                  company={e.company}
                  role={e.role}
                  start={e.start}
                  end={e.end}
                  bullets={e.bullets}
                />
              ))}
            </div>
          </Card>
        )}

        {/* EDUCATION */}
        {Array.isArray(profile?.education) && profile.education.length > 0 && (
          <Card title="Education" icon="🎓">
            <div style={{ display: "grid", gap: 10 }}>
              {profile.education.map((ed, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", gap: 12,
                  background: "#0b1220", border: "1px solid #1f2a44", padding: 12, borderRadius: 12
                }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{ed.school}</div>
                    <div style={{ color: "#94a3b8" }}>{ed.degree}</div>
                  </div>
                  <div style={{ color: "#94a3b8", whiteSpace: "nowrap" }}>
                    {(ed.start || "") + (ed.end ? ` – ${ed.end}` : "")}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* LINKS / CONTACT */}
        {(profile?.links && (profile.links.linkedin || profile.links.github || profile.links.website)) && (
          <Card title="Links" icon="🔗">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {profile.links.linkedin && <ButtonLink href={profile.links.linkedin}>LinkedIn</ButtonLink>}
              {profile.links.github && <ButtonLink href={profile.links.github}>GitHub</ButtonLink>}
              {profile.links.website && <ButtonLink href={profile.links.website}>Portfolio</ButtonLink>}
            </div>
          </Card>
        )}

        {/* CONTACT (optional – email if present in links.website/mailto) */}
        {profile?.email && (
          <Card>
            <ButtonLink href={`mailto:${profile.email}`}>Contact</ButtonLink>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ---------- small UI helpers ---------- */
function Card({ title, icon, children }) {
  return (
    <section style={{
      background: "#1e293b", border: "1px solid #334155", borderRadius: 18,
      padding: 18, marginBottom: 16, boxShadow: "0 10px 24px rgba(0,0,0,.25)"
    }}>
      {(title || icon) && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          {icon && <span aria-hidden="true">{icon}</span>}
          <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
        </div>
      )}
      {children}
    </section>
  );
}

function Chip({ children }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "8px 12px",
      borderRadius: 12,
      fontWeight: 700,
      background: "#0b1220",
      border: "1px solid #1f2a44",
      color: "#c7d2fe"
    }}>
      {children}
    </span>
  );
}

function TimelineItem({ company, role, start, end, bullets }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "18px 1fr", gap: 12 }}>
      <div style={{ display: "grid", placeItems: "center" }}>
        <div style={{
          width: 10, height: 10, borderRadius: 999, border: "2px solid #8b5cf6", background: "transparent"
        }} />
      </div>
      <div>
        <div style={{ fontWeight: 800 }}>{company}</div>
        <div style={{ color: "#cbd5e1", marginBottom: 6 }}>{role}</div>
        <div style={{ color: "#94a3b8", marginBottom: 8, fontSize: 13 }}>
          {(start || "") + (end ? ` – ${end}` : "")}
        </div>
        {Array.isArray(bullets) && bullets.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18, color: "#e5e7eb" }}>
            {bullets.map((b, i) => <li key={i} style={{ marginBottom: 4 }}>{b}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

function ButtonLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      style={{
        textDecoration: "none",
        borderRadius: 12,
        padding: "10px 14px",
        fontWeight: 800,
        display: "inline-block",
        background: "linear-gradient(90deg,#8b5cf6,#6366f1)",
        color: "#fff",
        boxShadow: "0 6px 16px rgba(139,92,246,.35)"
      }}
    >
      {children}
    </a>
  );
}

function Dots() {
  const dot = { width: 8, height: 8, borderRadius: "50%", background: "#fff", opacity: .9, animation: "bump .7s infinite alternate" };
  return (
    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <style>{`
        @keyframes bump { from { transform: translateY(0); opacity:.6 } to { transform: translateY(-6px); opacity:1 } }
      `}</style>
      <span style={dot} />
      <span style={{ ...dot, animationDelay: ".15s" }} />
      <span style={{ ...dot, animationDelay: ".3s" }} />
    </div>
  );
}
