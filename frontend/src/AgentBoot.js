// src/AgentBoot.js
import { createRoot } from "react-dom/client";
import React from "react";
import AgentChat from "./AgentChat";

// run once per browser session
(function bootAgentChat() {
  if (window.__AGENT_CHAT_BOOTED__) return;           // guard against HMR/reloads
  window.__AGENT_CHAT_BOOTED__ = true;

  // create a permanent host under <body>
  const host = document.createElement("div");
  host.id = "agent-chat-mount";
  host.style.position = "relative";
  host.style.zIndex = "2147483647";                   // sits above everything
  document.body.appendChild(host);

  // mount AgentChat as its own React root
  const root = createRoot(host);
  root.render(<AgentChat />);
})();
