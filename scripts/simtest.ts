// Headless balance test: simulate companies under 3 strategies and check invariants.
import { newGame, acceptJob, hire, buyEquipment, setMarketing, buyUpgrade } from "../src/sim/actions";
import { advanceDay } from "../src/sim/engine";
import type { GameState } from "../src/sim/types";

function playSmart(s: GameState) {
  // accept all offers while backlog reasonable
  const backlog = s.jobs.filter(j => j.status === "scheduled" || j.status === "inProgress").length;
  for (const j of s.jobs) if (j.status === "offered" && backlog < 8) acceptJob(s, j.id);
  if (s.day === 2) { setMarketing(s, "door", 10); setMarketing(s, "flyers", 15); }
  if (s.cash > 3500 && !s.equipment.some(e => e.id === "pro")) buyEquipment(s, "pro");
  if (s.cash > 1500 && s.employees.length === 0 && s.candidates.length) hire(s, s.candidates[0].id);
  if (s.cash > 2500 && s.employees.length === 1 && s.candidates.length) hire(s, s.candidates[0].id);
  if (s.cash > 2000 && !s.upgrades.includes("sop")) buyUpgrade(s, "sop");
  if (s.cash > 3000 && !s.upgrades.includes("sched")) buyUpgrade(s, "sched");
  if (s.pendingChoice) { s.pendingChoice = null; } // skip choices headlessly
}

function playIdle(_s: GameState) { /* accepts nothing, spends nothing */ }

function run(name: string, strat: (s: GameState) => void, days: number) {
  const s = newGame("TestCo", "Tester", "standard");
  let minCash = s.cash;
  for (let d = 0; d < days; d++) {
    strat(s);
    advanceDay(s);
    minCash = Math.min(minCash, s.cash);
    if (!Number.isFinite(s.cash)) throw new Error("cash is not finite");
    if (s.reputation < 1 || s.reputation > 5) throw new Error("reputation out of bounds: " + s.reputation);
    if (s.jobs.length > 500) throw new Error("job list unbounded");
  }
  console.log(`${name.padEnd(8)} day ${days}: cash=$${Math.round(s.cash)} rev=$${Math.round(s.lifetimeRevenue)} jobs=${s.lifetimeJobs} emp=${s.employees.length} rep=${s.reputation.toFixed(2)} brand=${s.brand.toFixed(1)} minCash=$${Math.round(minCash)}`);
  return s;
}

console.log("== 120-day simulations ==");
const smart = run("smart", playSmart, 120);
const idle = run("idle", playIdle, 120);
if (smart.lifetimeRevenue <= idle.lifetimeRevenue) throw new Error("smart play should beat doing nothing");
if (idle.lifetimeRevenue > 500) throw new Error("idle player should not earn meaningful revenue (no auto-accept in active play)");

// perf: 3 years with a mid-size company
const s = newGame("PerfCo", "T", "standard");
const t0 = Date.now();
for (let d = 0; d < 1095; d++) { playSmart(s); advanceDay(s); }
console.log(`perf: 1095 days in ${Date.now() - t0}ms; state jobs=${s.jobs.length} stats=${s.stats.length} customers=${s.customers.length}`);
if (Date.now() - t0 > 5000) throw new Error("simulation too slow");
console.log("ALL SIM TESTS PASSED");
