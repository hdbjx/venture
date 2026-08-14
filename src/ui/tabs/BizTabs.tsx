import React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import type { GameState } from "../../sim/types";
import { Bar, Card, Stat, Tip, fmt } from "../bits";
import { A, useGame } from "../../state/store";
import { CHANNELS, EQUIP_TIERS, UPGRADES } from "../../config/content";
import { FINANCE } from "../../config/balance";
import { leadsToday } from "../../sim/engine";

export function MarketingTab({ g }: { g: GameState }) {
  const total = CHANNELS.reduce((a, c) => a + (g.marketing[c.id] ?? 0), 0);
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card title="Channels" right={<span className="label num">total {fmt(total)}/day → ~{leadsToday(g).toFixed(1)} leads/day</span>}>
          <div className="space-y-4">
            {CHANNELS.map((ch) => {
              const locked = ch.needsReputation && g.reputation < ch.needsReputation;
              const v = g.marketing[ch.id] ?? 0;
              return (
                <div key={ch.id} className={locked ? "opacity-50" : ""}>
                  <div className="flex justify-between text-sm mb-0.5">
                    <Tip tip={ch.desc}><span>{ch.name}{ch.ownerHours ? <span className="text-gold-400 text-xs"> · costs you {ch.ownerHours}h/day</span> : null}</span></Tip>
                    <span className="num text-ink-300">{v > 0 ? `${fmt(v)}/day` : "off"}</span>
                  </div>
                  <input type="range" min={0} max={ch.maxSpend} step={5} value={v} disabled={!!locked}
                    onChange={(e) => A.setMarketing(ch.id, +e.target.value)} className="w-full" />
                  {locked && <div className="text-xs text-coral-400">Requires reputation ≥ {ch.needsReputation}★</div>}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card title="Brand awareness">
          <div className="num text-2xl font-semibold mb-1">{g.brand.toFixed(1)} <span className="text-sm text-ink-400">/100</span></div>
          <Bar value={g.brand} tone="sky" />
          <p className="text-xs text-ink-400 mt-2">
            Brand decays daily but compounds through marketing, good reviews and completed jobs. High brand generates organic leads for free and boosts conversion.
          </p>
        </Card>
        <Card title="How leads work">
          <p className="text-xs text-ink-300 leading-relaxed">
            Marketing buys <span className="text-mint-400">leads</span>, not revenue. Leads become job requests based on your prices vs competitors, reputation, brand and demand heat. Cheap prices convert well but attract budget customers and can overwhelm your crew — quality drops when you're overbooked.
          </p>
        </Card>
      </div>
    </div>
  );
}

export function EquipmentTab({ g }: { g: GameState }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card title="Equipment">
        <div className="space-y-3">
          {EQUIP_TIERS.map((t) => {
            const owned = g.equipment.find((e) => e.id === t.id);
            return (
              <div key={t.id} className="border border-ink-800 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{t.name} {owned && <span className="text-mint-400 text-xs">OWNED</span>}</div>
                    <div className="text-xs text-ink-400">{t.desc}</div>
                    <div className="text-xs text-ink-300 num mt-1">quality +{Math.round(t.quality * 100)}% · speed ×{t.speedMult}</div>
                  </div>
                  {owned ? (
                    <button className="btn" onClick={() => A.maintain(t.id)} disabled={owned.condition > 95}>Maintain</button>
                  ) : (
                    <Tip tip={t.price > g.cash ? "You can't afford this yet." : "Buying uses cash immediately."}>
                      <button className="btn btn-primary" onClick={() => A.buyEquipment(t.id)} disabled={t.price > g.cash}>{fmt(t.price)}</button>
                    </Tip>
                  )}
                </div>
                {owned && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-ink-400"><span>Condition</span><span className="num">{Math.round(owned.condition)}%</span></div>
                    <Bar value={owned.condition} tone={owned.condition < 40 ? "coral" : owned.condition < 70 ? "gold" : "mint"} />
                    {owned.condition < 60 && <div className="text-xs text-coral-400 mt-1">Worn equipment hurts job quality. Maintain it.</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      <Card title="Vehicles" right={<span className="label num">{g.vehicles} van{g.vehicles === 1 ? "" : "s"}</span>}>
        <p className="text-sm text-ink-300 mb-3">
          Each van lets 2 more employees work in the field and costs {fmt(FINANCE.vehicleMonthly)}/month to run. Without vans, you can only field one small crew.
        </p>
        <Tip tip={`One-time ${fmt(FINANCE.vanPrice)} + ${fmt(FINANCE.vehicleMonthly)}/mo running costs.`}>
          <button className="btn btn-primary" onClick={() => A.buyVan()} disabled={g.cash < FINANCE.vanPrice}>Buy work van — {fmt(FINANCE.vanPrice)}</button>
        </Tip>
        <p className="text-xs text-ink-500 mt-3">Tip: Equipment Financing (Finances tab) can fund a van if cash is tight — at a price.</p>
      </Card>
    </div>
  );
}

const CATS = ["Operations", "Marketing", "People", "Technology", "Customer", "Finance"] as const;

export function UpgradesTab({ g }: { g: GameState }) {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {CATS.map((cat) => (
        <Card key={cat} title={cat}>
          <div className="space-y-2">
            {UPGRADES.filter((u) => u.cat === cat).map((u) => {
              const owned = g.upgrades.includes(u.id);
              const missing = (u.requires ?? []).filter((r) => !g.upgrades.includes(r));
              const needPeople = (u.minEmployees ?? 0) > g.employees.length;
              const locked = missing.length > 0 || needPeople;
              return (
                <div key={u.id} className={`border rounded-lg p-2.5 ${owned ? "border-mint-500/40 bg-mint-500/5" : "border-ink-800"}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="text-sm font-medium">{u.name}</div>
                      <div className="text-xs text-ink-400">{u.desc}</div>
                      <div className="text-xs text-sky2-400 mt-0.5">{u.effect}</div>
                      {locked && !owned && (
                        <div className="text-xs text-coral-400 mt-0.5">
                          Requires: {[...missing.map((m) => UPGRADES.find((x) => x.id === m)?.name), needPeople ? `${u.minEmployees}+ employees` : null].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>
                    {owned ? <span className="text-mint-400 text-xs shrink-0">OWNED</span> : (
                      <button className="btn shrink-0" disabled={locked || g.cash < u.cost} onClick={() => A.buyUpgrade(u.id)}>{fmt(u.cost)}</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function FinancesTab({ g }: { g: GameState }) {
  const days = g.stats.slice(-60);
  const chart = days.map((d) => ({ day: d.day, revenue: d.revenue, profit: d.revenue - d.expenses, cash: d.cash }));
  const today = g.stats[g.stats.length - 1];
  const payroll = g.employees.reduce((a, e) => a + e.wage * 7, 0);
  const mkt = Object.values(g.marketing).reduce((a, b) => a + b, 0);
  const repeatPct = (() => {
    const done = g.customers.filter((c) => c.jobsDone > 0);
    if (!done.length) return 0;
    return Math.round((done.filter((c) => c.jobsDone > 1).length / done.length) * 100);
  })();
  const debt = g.loans.reduce((a, l) => a + l.balance, 0);
  const exportSave = useGame((st) => st.exportSave);
  const importSave = useGame((st) => st.importSave);
  const reset = useGame((st) => st.reset);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        <Card><Stat label="Cash" value={fmt(g.cash)} tone={g.cash < 0 ? "bad" : undefined} tip="What's in the bank. Payroll, loans and fixed costs come out whether or not revenue comes in." /></Card>
        <Card><Stat label="Revenue (mo)" value={fmt(g.monthRevenue)} tip="Revenue collected this calendar month." /></Card>
        <Card><Stat label="Profit (mo)" value={fmt(g.monthRevenue - g.monthExpenses)} tone={g.monthRevenue - g.monthExpenses >= 0 ? "good" : "bad"} tip="Month revenue minus month expenses." /></Card>
        <Card><Stat label="Payroll (wk)" value={fmt(payroll)} tip="Due every Friday." /></Card>
        <Card><Stat label="Marketing" value={`${fmt(mkt)}/d`} tip="Daily marketing budget across all channels." /></Card>
        <Card><Stat label="Debt" value={fmt(debt)} tone={debt > 0 ? "bad" : undefined} tip="Outstanding loan balances. Daily payments come out automatically." /></Card>
        <Card><Stat label="Jobs (life)" value={g.lifetimeJobs} /></Card>
        <Card><Stat label="Avg job" value={fmt(g.lifetimeJobs ? g.lifetimeRevenue / g.lifetimeJobs : 0)} tip="Lifetime revenue / jobs." /></Card>
        <Card><Stat label="Repeat rate" value={`${repeatPct}%`} tip="Share of customers who came back for a second job. Driven by quality and CRM follow-ups." /></Card>
        <Card><Stat label="Revenue (life)" value={fmt(g.lifetimeRevenue)} /></Card>
        <Card><Stat label="Expenses (life)" value={fmt(g.lifetimeExpenses)} /></Card>
        <Card><Stat label="Margin (life)" value={`${g.lifetimeRevenue ? Math.round(((g.lifetimeRevenue - g.lifetimeExpenses) / g.lifetimeRevenue) * 100) : 0}%`} /></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Daily revenue & profit (last 60 days)">
          <div className="h-52">
            <ResponsiveContainer>
              <AreaChart data={chart}>
                <CartesianGrid stroke="#243350" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#7387ab" fontSize={11} />
                <YAxis stroke="#7387ab" fontSize={11} width={48} />
                <RTooltip contentStyle={{ background: "#141f34", border: "1px solid #33456a", borderRadius: 8 }} labelFormatter={(d) => `Day ${d}`} />
                <Area type="monotone" dataKey="revenue" stroke="#4cc3ff" fill="#4cc3ff22" name="Revenue" />
                <Area type="monotone" dataKey="profit" stroke="#3ddc97" fill="#3ddc9722" name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Cash on hand">
          <div className="h-52">
            <ResponsiveContainer>
              <AreaChart data={chart}>
                <CartesianGrid stroke="#243350" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#7387ab" fontSize={11} />
                <YAxis stroke="#7387ab" fontSize={11} width={48} />
                <RTooltip contentStyle={{ background: "#141f34", border: "1px solid #33456a", borderRadius: 8 }} labelFormatter={(d) => `Day ${d}`} />
                <Area type="monotone" dataKey="cash" stroke="#f2b134" fill="#f2b13422" name="Cash" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Financing">
          <div className="space-y-2">
            {FINANCE.loans.map((l) => (
              <div key={l.id} className="flex justify-between items-center border border-ink-800 rounded-lg p-2.5">
                <div>
                  <div className="text-sm font-medium">{l.name}</div>
                  <div className="text-xs text-ink-400 num">{fmt(l.principal)} · {Math.round(l.ratePerYear * 100)}% APR · {l.termDays} days · ~{fmt((l.principal * (1 + l.ratePerYear * (l.termDays / 365))) / l.termDays)}/day</div>
                </div>
                <button className="btn" onClick={() => A.takeLoan(l.id)}>Borrow</button>
              </div>
            ))}
          </div>
          {g.loans.filter((l) => l.balance > 0).length > 0 && (
            <div className="mt-3">
              <div className="label mb-1">Active loans</div>
              {g.loans.filter((l) => l.balance > 0).map((l) => (
                <div key={l.id} className="flex justify-between text-sm py-1">
                  <span>{l.name}</span><span className="num text-coral-400">{fmt(l.balance)} left</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Save management">
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => useGame.getState().saveNow()}>Save now</button>
            <button className="btn" onClick={() => {
              const data = exportSave();
              if (!data) return;
              const blob = new Blob([data], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `${g.companyName.replace(/\s+/g, "-").toLowerCase()}-save.json`;
              a.click();
            }}>Export save</button>
            <label className="btn cursor-pointer">
              Import save
              <input type="file" accept="application/json" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                f.text().then((t) => { if (!importSave(t)) alert("That file isn't a valid save."); });
              }} />
            </label>
            <button className="btn btn-danger" onClick={() => { if (confirm("Delete this company forever and start over?")) reset(); }}>New game</button>
          </div>
          <p className="text-xs text-ink-500 mt-2">Autosaves every few days of game time and on every action. Saves are versioned so future updates keep your company.</p>
        </Card>
      </div>
    </div>
  );
}
