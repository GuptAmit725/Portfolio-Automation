// src/PortfolioPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import DocsSection from "./DocsSection";
import ProjectsSection from "./ProjectsSection";

const API_PROFILE = "http://127.0.0.1:8000/api/profile/generate/";
const API_JOBS    = "http://127.0.0.1:8000/api/jobs/match/";

export default function PortfolioPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [profile, setProfile] = useState(null);

  // jobs
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsErr, setJobsErr] = useState("");
  const [jobs, setJobs] = useState([]);
  const [jobMeta, setJobMeta] = useState(null);

  const generate = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await axios.post(API_PROFILE);
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

  const fetchJobs = async () => {
    setJobsLoading(true);
    setJobsErr("");
    try {
      const res = await axios.post(API_JOBS, {});
      const data = res.data || {};
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      setJobMeta({
        role: data.role,
        location: data.location,
        created_at: data.created_at,
      });
    } catch (e) {
      console.error(e);
      setJobsErr(e?.response?.data?.detail || e.message || "Failed to fetch jobs");
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("portfolio_profile");
    if (saved) {
      try { setProfile(JSON.parse(saved)); } catch {}
    }
  }, []);

  useEffect(() => {
    if (!profile && !loading) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => { fetchJobs(); }, []);

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
                width: 84, height: 84, borderRadius: "50%",
                background: "#111827", border: "3px solid #e5e7eb22", overflow: "hidden", flex: "0 0 auto"
              }}
            >
              {profile?.photo ? (
                <img src={profile.photo} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span role="img" aria-label="avatar" style={{ fontSize: 38, display: "grid", placeItems: "center", height: "100%" }}>👤</span>
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

        {profile?.email && (
          <Card>
            <ButtonLink href={`mailto:${profile.email}`}>Contact</ButtonLink>
          </Card>
        )}

        {/* --- Projects (new) --- */}
        <ProjectsSection />

        {/* --- Recommendation Letters & Certificates (before Jobs) --- */}
        <DocsSection docType="RECOMMENDATION" title="Recommendation Letters" />
        <DocsSection docType="CERTIFICATE" title="Certificates" />

        {/* ======================  RECOMMENDED JOBS  ====================== */}
        <Card title="Recommended Jobs" icon="💼">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ color: "#cbd5e1", fontSize: 14 }}>
              {jobMeta ? (
                <>
                  Found for <strong>{jobMeta.role}</strong> in <strong>{jobMeta.location}</strong>
                  {jobMeta.created_at && (
                    <> · <span style={{ opacity: .8 }}>
                      {new Date(jobMeta.created_at).toLocaleString()}
                    </span></>
                  )}
                </>
              ) : (<>Fetching top matches…</>)}
            </div>
            <button
              onClick={fetchJobs}
              disabled={jobsLoading}
              style={{
                border: 0, borderRadius: 12, padding: "8px 12px", fontWeight: 800, cursor: "pointer",
                background: "linear-gradient(90deg,#8b5cf6,#6366f1)", color: "#fff",
                boxShadow: "0 6px 16px rgba(139,92,246,.35)", opacity: jobsLoading ? 0.8 : 1
              }}
              title="Refresh jobs"
            >
              {jobsLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {jobsErr && (
            <div style={{ marginBottom: 12, background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 10, color: "#fecaca" }}>
              {jobsErr}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {jobsLoading && jobs.length === 0 && <SkeletonButtons count={6} />}

            {jobs.map((j) => (
              <a
                key={j.job_id}
                href={j.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  textDecoration: "none",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontWeight: 800,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  background: "linear-gradient(90deg,#8b5cf6,#6366f1)",
                  color: "#fff",
                  boxShadow: "0 6px 16px rgba(139,92,246,.35)"
                }}
                title={`${j.title} · ${j.company}`}
              >
                <span style={{ fontSize: 14, opacity: .9 }}>{j.company || "Company"}</span>
                <span style={{ fontSize: 16 }}>{j.title}</span>
                <span style={{ fontSize: 12, opacity: .9 }}>{j.location || jobMeta?.location}</span>
              </a>
            ))}

            {!jobsLoading && jobs.length === 0 && (
              <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No matches yet. Try Refresh.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------- small UI helpers ---------- */
function Card({ title, icon, children }) { /* unchanged */ 
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

function Chip({ children }) { /* unchanged */ 
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

function TimelineItem({ company, role, start, end, bullets }) { /* unchanged */ 
  return (
    <div style={{ display: "grid", gridTemplateColumns: "18px 1fr", gap: 12 }}>
      <div style={{ display: "grid", placeItems: "center" }}>
        <div style={{ width: 10, height: 10, borderRadius: 999, border: "2px solid #8b5cf6", background: "transparent" }} />
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

function ButtonLink({ href, children }) { /* unchanged */ 
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

function Dots() { /* unchanged */ 
  const dot = { width: 8, height: 8, borderRadius: "50%", background: "#fff", opacity: .9, animation: "bump .7s infinite alternate" };
  return (
    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <style>{`@keyframes bump { from { transform: translateY(0); opacity:.6 } to { transform: translateY(-6px); opacity:1 } }`}</style>
      <span style={dot} />
      <span style={{ ...dot, animationDelay: ".15s" }} />
      <span style={{ ...dot, animationDelay: ".3s" }} />
    </div>
  );
}

function SkeletonButtons({ count = 6 }) { /* unchanged */ 
  const base = {
    borderRadius: 12,
    padding: "12px 14px",
    background: "linear-gradient(90deg,#111827,#1f2937)",
    border: "1px solid #374151",
    height: 64
  };
  return Array.from({ length: count }).map((_, i) => <div key={i} style={base} />);
}
