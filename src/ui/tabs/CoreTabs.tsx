import React from "react";
import type { GameState, Job } from "../../sim/types";
import { Bar, Card, Stars, Stat, Tip, fmt } from "../bits";
import { A } from "../../state/store";
import { SERVICE_LABEL } from "../../config/content";
import { EMPLOYEES, SERVICES } from "../../config/balance";
import { conversionRate, laborPool } from "../../sim/engine";

const typeBadge: Record<string, string> = {
  budget: "text-ink-300", normal: "text-ink-200", premium: "text-gold-400",
  difficult: "text-coral-400", loyal: "text-mint-400", commercial: "text-sky2-400",
};

function JobRow({ j, offered }: { j: Job; offered: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-ink-800 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">
          {SERVICE_LABEL[j.service]} <span className="text-ink-400">for</span> {j.customerName}{" "}
          <span className={`text-xs ${typeBadge[j.customerType]}`}>({j.customerType})</span>
        </div>
        <div className="text-xs text-ink-400 num">
          {fmt(j.value)} · {j.hours}h · difficulty {j.difficulty} · expects {j.expectation}+ quality
          {offered && <> · expires day {j.expiresOn}</>}
        </div>
        {!offered && <div className="mt-1 w-40"><Bar value={j.progress} max={j.hours} tone="sky" /></div>}
      </div>
      {offered ? (
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => A.acceptJob(j.id)}>Accept</button>
          <button className="btn btn-ghost" onClick={() => A.rejectJob(j.id)}>Pass</button>
        </div>
      ) : (
        <span className="text-xs text-ink-400">{j.status === "inProgress" ? "in progress" : "scheduled"}</span>
      )}
    </div>
  );
}

export function JobsTab({ g }: { g: GameState }) {
  const offered = g.jobs.filter((j) => j.status === "offered");
  const active = g.jobs.filter((j) => j.status === "scheduled" || j.status === "inProgress");
  const recent = [...g.jobs.filter((j) => j.status === "done")].slice(-8).reverse();
  const pool = laborPool(g);
  const capacity = pool.reduce((a, w) => a + w.hours, 0);
  const backlog = active.reduce((a, j) => a + (j.hours - j.progress), 0);
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title={`Job requests (${offered.length})`} right={
        <Tip tip="Leads convert into requests based on price, reputation, brand and competitor pricing."><span className="label num">conv {(conversionRate(g) * 100).toFixed(0)}%</span></Tip>
      }>
        {offered.length === 0 && <div className="text-sm text-ink-400 py-4">No open requests. Marketing and reputation bring in leads — check the Marketing tab.</div>}
        {offered.map((j) => <JobRow key={j.id} j={j} offered />)}
      </Card>
      <div className="space-y-4">
        <Card title={`Scheduled work (${active.length})`} right={
          <Tip tip="Total labor-hours your team can deliver today vs hours still owed on scheduled jobs. Overbooked crews rush and quality drops.">
            <span className={`label num ${backlog > capacity * 1.5 ? "text-coral-400" : ""}`}>backlog {backlog.toFixed(0)}h / capacity {capacity.toFixed(0)}h/day</span>
          </Tip>
        }>
          {active.length === 0 && <div className="text-sm text-ink-400 py-4">Nothing scheduled. Accept a request to get to work.</div>}
          {active.map((j) => <JobRow key={j.id} j={j} offered={false} />)}
        </Card>
        <Card title="Recently completed">
          {recent.length === 0 && <div className="text-sm text-ink-400">No completed jobs yet.</div>}
          {recent.map((j) => (
            <div key={j.id} className="flex justify-between text-sm py-1 border-b border-ink-800 last:border-0">
              <span className="truncate">{SERVICE_LABEL[j.service]} · {j.customerName}</span>
              <span className="num text-ink-300">{fmt(j.value)} · Q{Math.round(j.quality ?? 0)}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

export function PricingCard({ g }: { g: GameState }) {
  return (
    <Card title="Pricing" right={<Tip tip="Price index vs the local market. Higher prices raise margins and customer expectations, but reduce conversion — unless your reputation supports it."><span className="label">?</span></Tip>}>
      <div className="space-y-3">
        {SERVICES.filter((s) => g.unlockedServices.includes(s.id)).map((s) => (
          <div key={s.id}>
            <div className="flex justify-between text-sm mb-1">
              <span>{s.name}</span>
              <span className="num text-ink-300">{fmt(s.basePrice * g.prices[s.id])} <span className="text-ink-500">({Math.round(g.prices[s.id] * 100)}%)</span></span>
            </div>
            <input type="range" min={0.6} max={1.8} step={0.05} value={g.prices[s.id]}
              onChange={(e) => A.setPrice(s.id, +e.target.value)} className="w-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function OverviewTab({ g }: { g: GameState }) {
  const offered = g.jobs.filter((j) => j.status === "offered").length;
  const active = g.jobs.filter((j) => j.status === "scheduled" || j.status === "inProgress").length;
  const recentReviews = [...g.reviews].slice(-5).reverse();
  const timeline = [...g.history].reverse().slice(0, 10);
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="space-y-4 lg:col-span-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><Stat label="Open requests" value={offered} tip="Jobs waiting for you to accept or pass." /></Card>
          <Card><Stat label="Scheduled" value={active} tip="Jobs your crew is working through." /></Card>
          <Card><Stat label="Owner fatigue" value={`${Math.round(g.ownerFatigue)}%`} tone={g.ownerFatigue > 70 ? "bad" : undefined} tip="Rises when you personally work long days. Above 70% you lose 2 working hours/day. Hire help." /></Card>
          <Card><Stat label="Market heat" value={`${Math.round(g.marketHeat * 100)}%`} tip="Local demand cycle. Heat waves and slowdowns move it." /></Card>
        </div>
        <PricingCard g={g} />
        <Card title="Company history">
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {timeline.map((h, i) => (
              <div key={i} className="text-sm flex gap-3">
                <span className="num text-ink-500 w-24 shrink-0">Day {h.day}</span>
                <span className={h.kind === "milestone" ? "text-gold-400" : "text-ink-200"}>{h.text}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card title="Reputation" right={<Stars value={g.reputation} />}>
          <div className="space-y-2">
            {recentReviews.length === 0 && <div className="text-sm text-ink-400">No reviews yet. Complete jobs to earn them.</div>}
            {recentReviews.map((r) => (
              <div key={r.id} className="text-sm border-b border-ink-800 last:border-0 pb-2">
                <span className="text-gold-400">{"★".repeat(r.stars)}</span>
                <span className="text-ink-500">{"★".repeat(5 - r.stars)}</span>
                <div className="text-ink-300">“{r.text}”</div>
                <div className="text-xs text-ink-500">{r.customerName} · {SERVICE_LABEL[r.service]}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Competitors">
          {g.competitors.filter((c) => c.alive).map((c) => (
            <div key={c.id} className="flex justify-between text-sm py-1">
              <span className="truncate">{c.name}</span>
              <span className="num text-ink-300">{Math.round(c.priceIndex * 100)}% · {c.reputation.toFixed(1)}★</span>
            </div>
          ))}
          {g.competitors.every((c) => !c.alive) && <div className="text-sm text-mint-400">You own this market.</div>}
        </Card>
        <Card title="Milestones">
          <div className="text-sm space-y-1">
            {g.milestones.length === 0 && <div className="text-ink-400">None yet — complete your first job.</div>}
            {g.milestones.map((m) => <div key={m} className="text-gold-400">✦ {m}</div>)}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function TeamTab({ g }: { g: GameState }) {
  const canManage = g.upgrades.includes("mgmt");
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title={`Your team (${g.employees.length})`}>
        {g.employees.length === 0 && (
          <div className="text-sm text-ink-400 py-3">
            It's just you. Your first hire doubles your capacity — but payroll hits every Friday whether jobs come in or not.
          </div>
        )}
        <div className="space-y-3">
          {g.employees.map((e) => (
            <div key={e.id} className="border border-ink-800 rounded-lg p-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">
                    {e.name} {e.isManager && <span className="text-sky2-400 text-xs">MANAGER</span>}
                    {e.trainingDaysLeft > 0 && <span className="text-gold-400 text-xs ml-1">in training ({e.trainingDaysLeft}d)</span>}
                  </div>
                  <div className="text-xs text-ink-400">age {e.age} · {fmt(e.wage)}/day · {e.traits.join(", ") || "no notable traits"}</div>
                </div>
                <div className="flex gap-1">
                  <Tip tip={`5-day course, ${fmt(EMPLOYEES.trainingCostPerDay * EMPLOYEES.trainingDays)}. +skill toward potential (${e.potential}).`}>
                    <button className="btn" onClick={() => A.train(e.id)} disabled={e.trainingDaysLeft > 0}>Train</button>
                  </Tip>
                  <Tip tip="+10% wage, +morale."><button className="btn" onClick={() => A.raise(e.id)}>Raise</button></Tip>
                  {canManage && !e.isManager && (
                    <Tip tip="Managers boost team quality & morale via leadership. +25% wage."><button className="btn" onClick={() => A.promote(e.id)}>Promote</button></Tip>
                  )}
                  <button className="btn btn-danger" onClick={() => A.fire(e.id)}>Fire</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-1 mt-2 text-xs">
                {([["Skill", e.skill], ["Speed", e.speed], ["Reliability", e.reliability], ["Service", e.service], ["Leadership", e.leadership], ["Morale", Math.round(e.morale)]] as const).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-ink-400"><span>{k}</span><span className="num">{Math.round(v)}</span></div>
                    <Bar value={v} tone={k === "Morale" ? (v < 35 ? "coral" : "mint") : "sky"} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title={`Hiring market (${g.candidates.length})`} right={<Tip tip="New candidates appear every few days and leave if ignored. Wage ask reflects skill and the labor market."><span className="label">?</span></Tip>}>
        {g.candidates.length === 0 && <div className="text-sm text-ink-400 py-3">No candidates right now. Check back in a few days.</div>}
        <div className="space-y-3">
          {g.candidates.map((c) => (
            <div key={c.id} className="border border-ink-800 rounded-lg p-3">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-ink-400">age {c.age} · asks {fmt(c.wageAsk)}/day · {c.traits.join(", ") || "no notable traits"} · leaves day {c.leavesOn}</div>
                </div>
                <button className="btn btn-primary" onClick={() => A.hire(c.id)}>Hire</button>
              </div>
              <div className="grid grid-cols-3 gap-x-4 gap-y-1 mt-2 text-xs">
                {([["Skill", c.skill], ["Speed", c.speed], ["Reliability", c.reliability], ["Service", c.service], ["Leadership", c.leadership], ["Potential", c.potential]] as const).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-ink-400"><span>{k}</span><span className="num">{v}</span></div>
                    <Bar value={v} tone={k === "Potential" ? "gold" : "sky"} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
