import React from "react";
import type { GameState } from "../sim/types";
import { dateOf } from "../sim/engine";

// Company level derived from milestones — pure UI, no state.
const LEVEL_TITLES = ["Side Hustle", "Local Crew", "Neighborhood Name", "The Go-To", "Regional Player", "Empire"];
export function companyLevel(g: GameState): { level: number; title: string; next: number } {
  const m = g.milestones.length;
  const level = Math.min(5, Math.floor(m / 2)) + 1; // 1..6
  return { level, title: LEVEL_TITLES[level - 1], next: level >= 6 ? 0 : level * 2 - m };
}

const hue = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };

function Figure({ x, name, delay, working }: { x: number; name: string; delay: number; working?: boolean }) {
  const h = hue(name);
  return (
    <g className="anim-bob" style={{ animationDelay: `${delay}ms`, transformOrigin: `${x}px 208px` }}>
      {/* body */}
      <rect x={x - 6} y={186} width={12} height={18} rx={4} fill={`hsl(${h} 45% 45%)`} />
      {/* head */}
      <circle cx={x} cy={179} r={6.5} fill="#e8c39e" />
      {/* cap */}
      <path d={`M ${x - 6.5} 177 a 6.5 6.5 0 0 1 13 0 z`} fill={`hsl(${h} 55% 35%)`} />
      {/* legs */}
      <rect x={x - 5} y={203} width={4} height={7} rx={1.5} fill="#2c3444" />
      <rect x={x + 1} y={203} width={4} height={7} rx={1.5} fill="#2c3444" />
      {working && <circle cx={x + 10} cy={184} r={2.2} className="anim-bubble" fill="#9fd8ff" opacity={0.9} />}
    </g>
  );
}

function Van({ x }: { x: number }) {
  return (
    <g>
      <rect x={x} y={176} width={62} height={26} rx={6} fill="#3b4a63" stroke="#55688a" strokeWidth={1} />
      <rect x={x + 42} y={181} width={16} height={11} rx={2} fill="#9fd8ff" opacity={0.85} />
      <rect x={x + 5} y={183} width={30} height={8} rx={2} fill="#7ee2b8" opacity={0.9} />
      <circle cx={x + 13} cy={204} r={5.5} fill="#151a24" stroke="#55688a" />
      <circle cx={x + 48} cy={204} r={5.5} fill="#151a24" stroke="#55688a" />
    </g>
  );
}

export function Scene({ g }: { g: GameState }) {
  const { level } = companyLevel(g);
  const sunday = g.day % 7 === 6;
  const dow = dateOf(g).toLocaleDateString("en-US", { weekday: "long" });
  const activeJobs = g.jobs.filter((j) => j.status === "inProgress" || j.status === "scheduled").length;
  const working = g.jobs.some((j) => j.status === "inProgress") && !sunday;
  const crew = sunday ? [] : [g.founderName || "You", ...g.employees.slice(0, 7).map((e) => e.name)];
  const vans = Math.min(g.vehicles, 3);
  const stars = Math.round(g.reputation);
  // building size grows with level
  const bw = 120 + Math.min(level, 4) * 26;
  const bh = 58 + Math.min(level, 4) * 16;
  const bx = 46;

  return (
    <div className="card overflow-hidden mb-4 relative select-none">
      <svg viewBox="0 0 800 236" className="w-full block" role="img" aria-label="Your company headquarters">
        {/* sky */}
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={sunday ? "#0a0e1a" : "#141b2e"} />
            <stop offset="100%" stopColor={sunday ? "#131a2c" : "#22304d"} />
          </linearGradient>
        </defs>
        <rect width="800" height="236" fill="url(#sky)" />
        {sunday ? (
          <>
            <circle cx="700" cy="52" r="17" fill="#e8e6d8" opacity="0.9" />
            <circle cx="693" cy="47" r="14" fill="#0a0e1a" opacity="0.85" />
            {[90, 200, 330, 470, 560, 640, 750].map((x, i) => (
              <circle key={x} cx={x} cy={26 + ((i * 37) % 60)} r="1.4" fill="#cdd6ea" className="anim-twinkle" style={{ animationDelay: `${i * 420}ms` }} />
            ))}
          </>
        ) : (
          <circle cx="702" cy="54" r="19" fill="#ffd98a" opacity="0.9" />
        )}
        {/* distant skyline */}
        {[0, 90, 210, 340, 460, 580, 690].map((x, i) => (
          <rect key={x} x={x} y={118 - ((i * 13) % 30)} width={70} height={100} fill="#1b2437" />
        ))}
        {/* ground + road */}
        <rect y="210" width="800" height="26" fill="#10151f" />
        <rect y="206" width="800" height="5" fill="#2a3448" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} x={20 + i * 100} y={221} width={34} height={3} rx={1.5} fill="#3a465e" />)}

        {/* HQ building */}
        <g>
          <rect x={bx} y={206 - bh} width={bw} height={bh} rx={4} fill="#252f45" stroke="#3a4a6a" />
          {level >= 3 && <rect x={bx + 10} y={206 - bh - 34} width={bw - 20} height={36} rx={4} fill="#20293d" stroke="#3a4a6a" />}
          {level >= 5 && <rect x={bx + bw / 2 - 14} y={206 - bh - 58} width={28} height={26} rx={3} fill="#1c2536" stroke="#3a4a6a" />}
          {/* garage door */}
          <rect x={bx + 12} y={206 - 40} width={44} height={40} rx={3} fill="#151c2b" stroke="#33405c" />
          {[0, 1, 2, 3].map((i) => <line key={i} x1={bx + 12} x2={bx + 56} y1={206 - 32 + i * 9} y2={206 - 32 + i * 9} stroke="#33405c" strokeWidth={1} />)}
          {/* windows */}
          {Array.from({ length: Math.min(level + 1, 5) }).map((_, i) => (
            <rect key={i} x={bx + 66 + i * 22} y={206 - bh + 12} width={14} height={14} rx={2}
              fill={sunday ? "#22304a" : "#ffd98a"} opacity={sunday ? 1 : 0.85} />
          ))}
          {/* sign */}
          <rect x={bx + 6} y={206 - bh - 22} width={bw - 12} height={18} rx={4} fill="#0f1420" stroke="#7ee2b8" strokeWidth={1.2} />
          <text x={bx + bw / 2} y={206 - bh - 9} textAnchor="middle" fill="#e6edf7" fontSize="11" fontWeight="700" style={{ letterSpacing: 0.5 }}>
            {g.companyName.toUpperCase().slice(0, 22)}
          </text>
          {/* reputation stars over sign */}
          {[0, 1, 2, 3, 4].map((i) => (
            <text key={i} x={bx + bw / 2 - 30 + i * 15} y={206 - bh - 28} textAnchor="middle" fontSize="11"
              fill={i < stars ? "#ffd98a" : "#3a4a6a"}>★</text>
          ))}
        </g>

        {/* vans */}
        {Array.from({ length: vans }).map((_, i) => <Van key={i} x={330 + i * 80} />)}
        {g.vehicles > 3 && <text x={330 + vans * 80 + 8} y={198} fill="#8b98b3" fontSize="12" className="num">×{g.vehicles}</text>}

        {/* crew */}
        {crew.map((n, i) => <Figure key={n + i} x={230 + i * 26} name={n} delay={i * 260} working={working && i < 3} />)}

        {/* active job site */}
        <g opacity={activeJobs > 0 && !sunday ? 1 : 0.35}>
          <rect x={676} y={168} width={72} height={38} rx={3} fill="#232c40" stroke="#3a4a6a" />
          <path d="M 670 170 L 712 146 L 754 170 Z" fill="#2c3854" stroke="#3a4a6a" />
          <rect x={704} y={184} width={16} height={22} rx={2} fill="#151c2b" />
          {working && [0, 1, 2].map((i) => (
            <circle key={i} cx={690 + i * 9} cy={172} r={3 - i * 0.5} fill="#9fd8ff" className="anim-bubble" style={{ animationDelay: `${i * 500}ms` }} />
          ))}
        </g>
        {activeJobs > 0 && (
          <g>
            <rect x={676} y={130} width={72} height={16} rx={8} fill="#0f1420" stroke="#33405c" />
            <text x={712} y={142} textAnchor="middle" fill="#cdd6ea" fontSize="10" className="num">{activeJobs} job{activeJobs === 1 ? "" : "s"} on</text>
          </g>
        )}

        {sunday && (
          <g transform={`translate(${bx + 20} ${206 - 52})`}>
            <rect width="52" height="20" rx="3" fill="#0f1420" stroke="#f08c7d" />
            <text x="26" y="14" textAnchor="middle" fill="#f08c7d" fontSize="10" fontWeight="700">CLOSED</text>
          </g>
        )}
      </svg>
      <div className="absolute top-2 right-3 text-xs text-ink-400 num">{dow}{sunday ? " — day off" : ""}</div>
    </div>
  );
}

