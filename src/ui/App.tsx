import React, { useEffect, useRef, useState } from "react";
import { A, useGame } from "../state/store";
import type { Difficulty, GameState } from "../sim/types";
import { fmtDate, money } from "../sim/engine";
import { TIME } from "../config/balance";
import { Card, Modal, Stars, Tip, fmt } from "./bits";
import { JobsTab, OverviewTab, TeamTab } from "./tabs/CoreTabs";
import { companyLevel } from "./Scene";
import { EquipmentTab, FinancesTab, MarketingTab, UpgradesTab } from "./tabs/BizTabs";
import { advanceDay } from "../sim/engine";
import { makeCandidate, makeCustomer, makeJobOffer } from "../sim/gen";

const TABS = ["Overview", "Jobs", "Team", "Marketing", "Equipment", "Upgrades", "Finances"] as const;
type Tab = (typeof TABS)[number];

// --------------------------------------------------------------- new game
function NewGameScreen() {
  const start = useGame((s) => s.start);
  const [name, setName] = useState("Clearline Services");
  const [founder, setFounder] = useState("");
  const [diff, setDiff] = useState<Difficulty>("standard");
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold tracking-tight">VentureBuilt</h1>
        <p className="text-ink-300 text-sm mt-1 mb-6">You've got a few hundred dollars, a beat-up pressure washer, and a name. Build it into an empire.</p>
        <div className="space-y-4">
          <div>
            <div className="label mb-1">Company name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-ink-800 border border-ink-700 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <div className="label mb-1">Founder name</div>
            <input value={founder} onChange={(e) => setFounder(e.target.value)} placeholder="You" className="w-full bg-ink-800 border border-ink-700 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <div className="label mb-1">Difficulty</div>
            <div className="grid grid-cols-3 gap-2">
              {(["casual", "standard", "hard"] as Difficulty[]).map((d) => (
                <button key={d} onClick={() => setDiff(d)}
                  className={`btn capitalize ${diff === d ? "btn-primary" : ""}`}>{d}</button>
              ))}
            </div>
            <p className="text-xs text-ink-500 mt-1.5">
              {diff === "casual" && "Friendlier demand, cheaper costs, gentler events. Starting cash $1,500."}
              {diff === "standard" && "The intended experience. Starting cash $1,000."}
              {diff === "hard" && "Weaker demand, pricier everything, harsher events, pushier wage asks. Starting cash $700."}
            </p>
          </div>
          <button className="btn btn-primary w-full py-2.5" onClick={() => start(name.trim(), founder.trim() || "Founder", diff)}>
            Found the company
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ topbar
function CashHUD({ g }: { g: GameState }) {
  const prev = useRef(g.cash);
  const [floats, setFloats] = useState<{ id: number; amt: number }[]>([]);
  const idRef = useRef(0);
  useEffect(() => {
    const delta = g.cash - prev.current;
    prev.current = g.cash;
    if (Math.abs(delta) >= 1) {
      const id = ++idRef.current;
      setFloats((f) => [...f.slice(-2), { id, amt: delta }]);
      const t = setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1500);
      return () => clearTimeout(t);
    }
  }, [g.cash]);
  return (
    <Tip tip="Cash on hand. Don't let payroll catch you at zero.">
      <span className="relative inline-block">
        <span className={`num font-bold text-base ${g.cash < 0 ? "text-coral-400" : g.cash < 250 ? "text-gold-400" : "text-mint-400"}`}>{money(g.cash)}</span>
        {floats.map((f) => (
          <span key={f.id} className={`cash-float absolute -top-1 left-full ml-2 num text-xs font-semibold pointer-events-none whitespace-nowrap ${f.amt >= 0 ? "text-mint-400" : "text-coral-400"}`}>
            {f.amt >= 0 ? "+" : "−"}{money(Math.abs(f.amt))}
          </span>
        ))}
      </span>
    </Tip>
  );
}

function TopBar({ g }: { g: GameState }) {
  const setSpeed = useGame((s) => s.setSpeed);
  const lv = companyLevel(g);
  const sunday = g.day % 7 === 6;
  return (
    <div className="sticky top-0 z-30 bg-ink-950/90 backdrop-blur border-b border-ink-800">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-mint-500 to-sky2-500 grid place-items-center font-black text-ink-950 text-sm shadow-lg shadow-mint-500/20">
            {g.companyName.slice(0, 1).toUpperCase()}
          </div>
          <div className="leading-tight">
            <div className="font-bold tracking-tight text-sm">{g.companyName}</div>
            <Tip tip={lv.next ? `Reach ${lv.next} more milestone${lv.next === 1 ? "" : "s"} to level up.` : "Max level. You built the empire."}>
              <div className="text-[11px] text-gold-400 font-semibold">Lv {lv.level} · {lv.title}</div>
            </Tip>
          </div>
        </div>
        <div className="num text-sm text-ink-300">
          {fmtDate(g)} <span className="text-ink-500">· day {g.day}</span>
          {sunday && <span className="ml-1.5 text-sky2-400">☾ closed</span>}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {([0, 1, 2, 4] as const).map((v) => (
            <button key={v} onClick={() => setSpeed(v)}
              className={`btn px-2.5 ${g.speed === v ? "btn-primary" : "btn-ghost"}`}>{v === 0 ? "⏸" : `${v}×`}</button>
          ))}
          <Tip tip="Advance exactly one day."><button className="btn btn-ghost" onClick={() => A.stepDay()}>+1 day</button></Tip>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <CashHUD g={g} />
          <Tip tip="Reputation drives demand, pricing power, referrals and commercial opportunities."><span><Stars value={g.reputation} /></span></Tip>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ toasts
function Toasts({ g }: { g: GameState }) {
  return (
    <div className="fixed bottom-4 right-4 z-30 space-y-2 w-72 pointer-events-none">
      {g.toasts.slice(-5).map((t) => (
        <div key={t.id} className={`toast card px-3 py-2 text-sm border-l-2 ${t.tone === "good" ? "border-l-mint-400" : t.tone === "bad" ? "border-l-coral-400" : "border-l-sky2-400"}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------- tutorial
const TUTORIAL: { text: string; goto?: Tab }[] = [
  { text: "Every company starts somewhere. You've got some cash, a starter kit, and zero customers. A neighbor already asked for a quote — open the Jobs tab.", goto: "Jobs" },
  { text: "Accept the job request. Accepted jobs go on your schedule; your labor hours work through them each day." },
  { text: "Now press ▶ 1× (or +1 day) in the top bar and let a day or two pass. Watch the job complete and the money land." },
  { text: "That payment is fuel. Reinvest it: set marketing spend to bring in leads, and keep an eye on prices — cheap converts, premium pays.", goto: "Marketing" },
  { text: "That's the loop: leads → jobs → quality → reviews → better leads. Hire when your backlog outgrows your hours. Good luck, founder." },
];

function Tutorial({ g, setTab }: { g: GameState; setTab: (t: Tab) => void }) {
  if (g.tutorialStep < 0 || g.tutorialStep >= TUTORIAL.length) return null;
  const step = TUTORIAL[g.tutorialStep];
  return (
    <div className="fixed bottom-4 left-4 z-30 w-80">
      <div className="card p-4 border-mint-500/40">
        <div className="label mb-1">Getting started · {g.tutorialStep + 1}/{TUTORIAL.length}</div>
        <p className="text-sm text-ink-200">{step.text}</p>
        <div className="flex gap-2 mt-3">
          <button className="btn btn-primary" onClick={() => { if (step.goto) setTab(step.goto); A.tutorialNext(); }}>
            {g.tutorialStep === TUTORIAL.length - 1 ? "Let's build" : "Next"}
          </button>
          <button className="btn btn-ghost" onClick={() => A.tutorialSkip()}>Skip</button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------- debug
function DebugMenu({ g, onClose }: { g: GameState; onClose: () => void }) {
  const act = useGame((s) => s.act);
  return (
    <Modal title="Developer tools" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn" onClick={() => act((s) => { s.cash += 1000; })}>+$1,000</button>
        <button className="btn" onClick={() => act((s) => { s.cash += 25000; })}>+$25,000</button>
        <button className="btn" onClick={() => act((s) => { for (let i = 0; i < 7; i++) advanceDay(s); })}>+7 days</button>
        <button className="btn" onClick={() => act((s) => makeJobOffer(s, makeCustomer(s)))}>Spawn job</button>
        <button className="btn" onClick={() => act((s) => makeCandidate(s, true))}>Spawn star applicant</button>
        <button className="btn" onClick={() => act((s) => { s.reputation = Math.min(5, s.reputation + 0.5); })}>+0.5★ reputation</button>
        <button className="btn" onClick={() => act((s) => { s.brand = Math.min(100, s.brand + 20); })}>+20 brand</button>
        <button className="btn" onClick={() => act((s) => { s.upgrades = ["sop","sched","crm","booking","branding","bulk","onboard","trainprog","mgmt","qc","routing","analytics","loyalty","premiumSrv"]; })}>Unlock upgrades</button>
      </div>
      <div className="text-xs text-ink-400 num mt-3 space-y-0.5">
        <div>rngState {g.rngState} · seed {g.seed} · marketHeat {g.marketHeat.toFixed(2)}</div>
        <div>customers {g.customers.length} · jobs in state {g.jobs.length} · stats {g.stats.length}d</div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------- app
export default function App() {
  const g = useGame((s) => s.game);
  const boot = useGame((s) => s.boot);
  const tick = useGame((s) => s.tick);
  const offline = useGame((s) => s.offlineSummary);
  const dismissOffline = useGame((s) => s.dismissOffline);
  const [tab, setTab] = useState<Tab>("Overview");
  const [debug, setDebug] = useState(false);
  const booted = useRef(false);

  useEffect(() => {
    if (!booted.current) { booted.current = true; boot(); }
  }, [boot]);

  // game clock
  useEffect(() => {
    if (!g || g.speed === 0) return;
    const iv = setInterval(tick, TIME.msPerDay[g.speed]);
    return () => clearInterval(iv);
  }, [g?.speed, tick, g]);

  // debug hotkey
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") { e.preventDefault(); setDebug((d) => !d); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // save on tab close
  useEffect(() => {
    const h = () => useGame.getState().saveNow();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  if (!g) return <NewGameScreen />;

  return (
    <div className="min-h-screen pb-10">
      <TopBar g={g} />
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex gap-1 py-3 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`btn whitespace-nowrap ${tab === t ? "bg-ink-700 text-ink-100" : "btn-ghost text-ink-300"}`}>{t}</button>
          ))}
        </nav>
        {tab === "Overview" && <OverviewTab g={g} />}
        {tab === "Jobs" && <JobsTab g={g} />}
        {tab === "Team" && <TeamTab g={g} />}
        {tab === "Marketing" && <MarketingTab g={g} />}
        {tab === "Equipment" && <EquipmentTab g={g} />}
        {tab === "Upgrades" && <UpgradesTab g={g} />}
        {tab === "Finances" && <FinancesTab g={g} />}
      </div>

      <Toasts g={g} />
      <Tutorial g={g} setTab={setTab} />
      {debug && <DebugMenu g={g} onClose={() => setDebug(false)} />}

      {g.pendingChoice && (
        <Modal title={g.pendingChoice.title}>
          <p className="text-sm text-ink-200 mb-4">{g.pendingChoice.body}</p>
          <div className="space-y-2">
            {g.pendingChoice.options.map((o) => (
              <button key={o.id} className="btn w-full text-left flex flex-col items-start" onClick={() => A.resolveChoice(o.id)}>
                <span>{o.label}</span>
                {o.hint && <span className="text-xs text-ink-400 font-normal">{o.hint}</span>}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {offline && (
        <Modal title="While you were away" onClose={dismissOffline}>
          <p className="text-sm text-ink-300 mb-3">Your team kept working for {offline.days} day{offline.days === 1 ? "" : "s"} (offline progress is capped so active play always wins).</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Card><div className="label">Revenue</div><div className="num text-mint-400 font-semibold">{fmt(offline.revenue)}</div></Card>
            <Card><div className="label">Expenses</div><div className="num text-coral-400 font-semibold">{fmt(offline.expenses)}</div></Card>
            <Card><div className="label">Profit</div><div className="num font-semibold">{fmt(offline.revenue - offline.expenses)}</div></Card>
            <Card><div className="label">Jobs · Reviews</div><div className="num font-semibold">{offline.jobs} · {offline.reviews}</div></Card>
          </div>
          <button className="btn btn-primary w-full mt-4" onClick={dismissOffline}>Back to work</button>
        </Modal>
      )}
    </div>
  );
}
