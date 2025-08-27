// src/AgentChat.jsx
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";

const API = "http://127.0.0.1:8000/api/agent/chat/";
const STORAGE_KEY = "agent_chat_is_open";

export default function AgentChat() {
  // restore last state
  const [isOpen, setIsOpen] = useState(() => {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === "1";
  });
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, isOpen ? "1" : "0");
  }, [isOpen]);

  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I can answer questions about your CV." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

// create a portal root once
// --- singleton portal root (never removed)
const [rootEl] = useState(() => {
// reuse if already created by a previous render/regeneration
if (window.__AGENT_CHAT_ROOT && document.body.contains(window.__AGENT_CHAT_ROOT)) {
    return window.__AGENT_CHAT_ROOT;
}
const el = document.createElement("div");
el.id = "agent-chat-root";
// force its own stacking context + max z-index
el.style.position = "relative";
el.style.zIndex = "2147483647";
document.body.appendChild(el);
window.__AGENT_CHAT_ROOT = el; // store globally
return el;
});

// IMPORTANT: do NOT remove the root on unmount, just ensure it’s attached
useEffect(() => {
  if (!document.body.contains(rootEl)) {
    document.body.appendChild(rootEl);
  }
  // no cleanup that removes the node — leave it in the DOM as a singleton
}, [rootEl]);


  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await axios.post(API, { message: text });
      const reply = res?.data?.reply || "Sorry, I didn’t get that.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Error talking to the agent. Try again." }
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        boxRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
      });
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // styles
  const launcherBtn = {
    position: "fixed",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 999,
    border: 0,
    cursor: "pointer",
    background: "linear-gradient(90deg,#8b5cf6,#6366f1)",
    color: "#fff",
    fontWeight: 900,
    boxShadow: "0 12px 28px rgba(99,102,241,.45)",
  };
  const shell = {
    position: "fixed",
    right: 20,
    bottom: 20,
    width: 360,
    maxWidth: "92vw",
    background: "#0b1220",
    border: "1px solid #1f2a44",
    borderRadius: 16,
    boxShadow: "0 16px 36px rgba(0,0,0,.35)",
    color: "#e5e7eb",
    overflow: "hidden",
  };
  const header = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    background: "#111827",
    borderBottom: "1px solid #1f2a44",
  };
  const dot = {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "radial-gradient(circle at 30% 30%, #8b5cf6, #7c3aed)",
    boxShadow: "0 0 10px rgba(139,92,246,.7)",
  };

  const ui = !isOpen ? (
    <button
      style={launcherBtn}
      onClick={() => setIsOpen(true)}
      aria-label="Open chat"
      title="Open chat"
    >
      💬
    </button>
  ) : (
    <>
      <button
        style={{ ...launcherBtn, opacity: 0, pointerEvents: "none" }}
        aria-hidden
        tabIndex={-1}
      />
      <section style={shell} role="dialog" aria-label="Portfolio Assistant chat">
        <div style={header}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={dot} />
            <strong>Portfolio Assistant</strong>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{ background: "transparent", border: 0, color: "#94a3b8", cursor: "pointer", fontWeight: 800 }}
            aria-label="Minimize chat"
            title="Minimize"
          >
            ─
          </button>
        </div>

        <div
          ref={boxRef}
          style={{
            height: 360,
            overflowY: "auto",
            padding: 12,
            display: "grid",
            gap: 10,
            background: "linear-gradient(180deg,#0b1220 0%,#0b1220 60%,#0f172a 100%)",
          }}
        >
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "80%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #1f2a44",
                  background: m.role === "user" ? "#1e293b" : "rgba(139,92,246,.08)",
                }}
              >
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4, fontWeight: 700 }}>
                  {m.role === "user" ? "You" : "Assistant"}
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
              </div>
            </div>
          ))}
          {loading && <div style={{ color: "#94a3b8", fontStyle: "italic" }}>typing…</div>}
        </div>

        <div style={{ padding: 10, borderTop: "1px solid #1f2a44", background: "#0b1220", display: "flex", gap: 8 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask about your CV…"
            style={{
              flex: 1,
              resize: "none",
              background: "#0f172a",
              color: "#e5e7eb",
              border: "1px solid #1f2a44",
              borderRadius: 10,
              padding: "10px 12px",
              outline: "none",
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              border: 0,
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 900,
              cursor: "pointer",
              background: "linear-gradient(90deg,#8b5cf6,#6366f1)",
              color: "#fff",
              opacity: loading || !input.trim() ? 0.7 : 1,
            }}
          >
            Send
          </button>
        </div>
      </section>
    </>
  );

  // render outside page DOM to avoid being affected by rerenders/stacking
  return createPortal(ui, rootEl);
}
