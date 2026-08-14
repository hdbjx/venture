import React, { useState } from "react";
import { money } from "../sim/engine";

export function Card({ title, right, children, className = "" }: { title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card p-4 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-ink-200">{title}</div>
          <div>{right}</div>
        </div>
      )}
      {children}
    </div>
  );
}

export function Tip({ tip, children }: { tip: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg bg-ink-800 border border-ink-600 p-2 text-xs text-ink-200 shadow-xl pointer-events-none">
          {tip}
        </span>
      )}
    </span>
  );
}

export function Stat({ label, value, tip, tone }: { label: string; value: React.ReactNode; tip?: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-mint-400" : tone === "bad" ? "text-coral-400" : "text-ink-100";
  const inner = (
    <div className="min-w-0">
      <div className="label">{label}</div>
      <div className={`num text-lg font-semibold ${color} truncate`}>{value}</div>
    </div>
  );
  return tip ? <Tip tip={tip}>{inner}</Tip> : inner;
}

export function Bar({ value, max = 100, tone = "mint" }: { value: number; max?: number; tone?: "mint" | "gold" | "coral" | "sky" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const c = { mint: "bg-mint-400", gold: "bg-gold-400", coral: "bg-coral-400", sky: "bg-sky2-400" }[tone];
  return (
    <div className="h-1.5 w-full rounded bg-ink-700 overflow-hidden">
      <div className={`h-full rounded ${c} transition-all`} style={{ width: pct + "%" }} />
    </div>
  );
}

export function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose?: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`card p-5 w-full ${wide ? "max-w-2xl" : "max-w-md"} shadow-2xl`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          {onClose && <button className="btn btn-ghost" onClick={onClose}>✕</button>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="text-gold-400 num">
      {value.toFixed(1)}<span className="ml-0.5">★</span>
    </span>
  );
}

export const fmt = money;
