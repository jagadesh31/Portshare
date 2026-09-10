'use client';
import { useState, useEffect } from "react";
import { Check } from "lucide-react";

export default function TerminalMockup({ samplePort, sampleUrl }: { samplePort: string, sampleUrl: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="hero-terminal" aria-label="Sample tunnel output">
      <div className="terminal-chrome">
        <span className="terminal-dot red" />
        <span className="terminal-dot yellow" />
        <span className="terminal-dot green" />
        <p className="terminal-title">portshare — tunnel</p>
      </div>

      <div className="terminal-line">
        <span className="term-prompt">$</span>
        <span className="term-cmd">portshare connect --port {samplePort}</span>
      </div>
      <div className="terminal-line">
        <span className="term-dim">→</span>
        <span className="term-dim">Connecting to PortShare server...</span>
      </div>
      <div className="terminal-line">
        <span className="term-status-ok"><Check size={14} className="inline-icon" /></span>
        <span className="term-dim">Tunnel established</span>
      </div>
      <div className="terminal-line">
        <span className="term-dim">  Public URL</span>
        <span className="term-arrow">→</span>
        <span className="term-url">{sampleUrl}</span>
      </div>
      <div className="terminal-line">
        <span className="term-dim">  Forwarding</span>
        <span className="term-arrow">→</span>
        <span className="term-local">http://localhost:{samplePort}</span>
      </div>
      <div className="terminal-line">
        <span className="term-dim">  Press Ctrl+C to stop</span>
        {mounted && <span className="term-cursor" />}
      </div>
    </div>
  );
}
