import type { Candidate, Difficulty, GameState } from "./types";
import { DEMAND, EMPLOYEES, EQUIPMENT_MAINT, FINANCE, OFFLINE, REPUTATION, SERVICES, START } from "../config/balance";
import { CHANNELS, EQUIP_TIERS, UPGRADES } from "../config/content";
import { advanceDayAuto, applyEvent, log, money, spend, toast, unlockServicesForTier } from "./engine";
import { makeCandidate, makeCompetitors, makeCustomer, makeJobOffer } from "./gen";

export const SAVE_VERSION = 1;

export function newGame(companyName: string, founderName: string, difficulty: Difficulty): GameState {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const s: GameState = {
    version: SAVE_VERSION,
    seed,
    rngState: seed,
    companyName: companyName || "Clearline Services",
    founderName: founderName || "Founder",
    difficulty,
    day: 0,
    startEpoch: Date.parse("2026-01-05T00:00:00"), // a Monday
    lastRealTime: Date.now(),
    speed: 0,
    cash: START.cash[difficulty],
    lifetimeRevenue: 0,
    lifetimeExpenses: 0,
    lifetimeJobs: 0,
    prices: { driveway: 1, windows: 1, gutters: 1, softwash: 1, commercial: 1 },
    unlockedServices: SERVICES.filter((x) => x.unlockedAtStart).map((x) => x.id),
    customers: [],
    jobs: [],
    nextId: 1,
    employees: [],
    candidates: [],
    ownerFatigue: 0,
    equipment: [{ id: "starter", condition: 80, purchasedOn: 0 }],
    vehicles: 0,
    marketing: Object.fromEntries(CHANNELS.map((c) => [c.id, 0])),
    brand: 3,
    reputation: REPUTATION.start,
    reviews: [],
    referralCredits: 0,
    competitors: [],
    marketHeat: 1,
    loans: [],
    upgrades: [],
    pendingChoice: null,
    stats: [],
    weekRevenue: 0,
    weekExpenses: 0,
    monthRevenue: 0,
    monthExpenses: 0,
    milestones: [],
    history: [],
    toasts: [],
    tutorialStep: 0,
    debugUnlocked: false,
  };
  makeCompetitors(s);
  makeCandidate(s);
  // guaranteed first lead so the tutorial has something to point at
  makeJobOffer(s, makeCustomer(s, "normal"));
  log(s, `${s.companyName} founded by ${s.founderName}.`, "founded");
  return s;
}

// ---------------------------------------------------------------- jobs
export function acceptJob(s: GameState, jobId: number) {
  const j = s.jobs.find((x) => x.id === jobId);
  if (j && j.status === "offered") {
    j.status = "scheduled";
    if (s.tutorialStep === 1) s.tutorialStep = 2;
  }
}
export function rejectJob(s: GameState, jobId: number) {
  const j = s.jobs.find((x) => x.id === jobId);
  if (j && j.status === "offered") j.status = "rejected";
}

// ---------------------------------------------------------------- pricing
export function setPrice(s: GameState, service: string, idx: number) {
  const v = Math.max(DEMAND.priceIndexMin, Math.min(DEMAND.priceIndexMax, idx));
  (s.prices as Record<string, number>)[service] = +v.toFixed(2);
}

// ---------------------------------------------------------------- people
export function hire(s: GameState, candidateId: number): boolean {
  const c = s.candidates.find((x) => x.id === candidateId);
  if (!c) return false;
  s.candidates = s.candidates.filter((x) => x.id !== candidateId);
  const emp: Candidate = { ...c };
  emp.hiredOn = s.day;
  if (s.upgrades.includes("onboard")) emp.skill = Math.min(emp.potential, emp.skill + 8);
  const { appearedOn, leavesOn, ...rest } = emp;
  s.employees.push(rest);
  toast(s, `Hired ${c.name} at ${money(c.wage)}/day`, "good");
  log(s, `Hired ${c.name}.`, "hire");
  return true;
}

export function fire(s: GameState, employeeId: number) {
  const e = s.employees.find((x) => x.id === employeeId);
  if (!e) return;
  s.employees = s.employees.filter((x) => x.id !== employeeId);
  spend(s, e.wage * 3, `Severance for ${e.name}`, true);
  for (const other of s.employees) other.morale = Math.max(0, other.morale - 4);
  log(s, `${e.name} was let go.`, "event");
}

export function train(s: GameState, employeeId: number): boolean {
  const e = s.employees.find((x) => x.id === employeeId);
  if (!e || e.trainingDaysLeft > 0) return false;
  const cost = EMPLOYEES.trainingCostPerDay * EMPLOYEES.trainingDays;
  if (!spend(s, cost, `Training for ${e.name}`)) { toast(s, "Not enough cash for training", "bad"); return false; }
  e.trainingDaysLeft = EMPLOYEES.trainingDays;
  return true;
}

export function giveRaise(s: GameState, employeeId: number, pct = 0.1) {
  const e = s.employees.find((x) => x.id === employeeId);
  if (!e) return;
  e.wage = Math.round(e.wage * (1 + pct));
  e.wageAsk = Math.max(e.wageAsk, e.wage);
  e.morale = Math.min(100, e.morale + 12);
  toast(s, `${e.name} now earns ${money(e.wage)}/day`, "info");
}

export function promoteManager(s: GameState, employeeId: number): boolean {
  if (!s.upgrades.includes("mgmt")) return false;
  const e = s.employees.find((x) => x.id === employeeId);
  if (!e) return false;
  for (const other of s.employees) other.isManager = false;
  e.isManager = true;
  e.wage = Math.round(e.wage * 1.25);
  toast(s, `${e.name} promoted to Manager`, "good");
  log(s, `${e.name} promoted to Manager.`, "hire");
  return true;
}

// ---------------------------------------------------------------- equipment
export function buyEquipment(s: GameState, tierId: string): boolean {
  const t = EQUIP_TIERS.find((x) => x.id === tierId);
  if (!t) return false;
  if (s.equipment.some((e) => e.id === tierId)) return false;
  if (!spend(s, t.price, `Purchased ${t.name}`)) { toast(s, "Not enough cash", "bad"); return false; }
  s.equipment.push({ id: tierId, condition: 100, purchasedOn: s.day });
  log(s, `Purchased ${t.name} for ${money(t.price)}.`, "purchase");
  unlockServicesForTier(s);
  return true;
}

export function maintainEquipment(s: GameState, tierId: string): boolean {
  const item = s.equipment.find((e) => e.id === tierId);
  const t = EQUIP_TIERS.find((x) => x.id === tierId);
  if (!item || !t) return false;
  const cost = Math.max(25, Math.round(Math.max(t.price, 600) * EQUIPMENT_MAINT.maintainCostFactor * ((100 - item.condition) / 100 + 0.3)));
  if (!spend(s, cost, `Maintenance: ${t.name}`)) { toast(s, "Not enough cash", "bad"); return false; }
  item.condition = 100;
  return true;
}

export function buyVan(s: GameState): boolean {
  if (!spend(s, FINANCE.vanPrice, "Purchased work van")) { toast(s, "Not enough cash", "bad"); return false; }
  s.vehicles++;
  log(s, `Bought work van #${s.vehicles}.`, "purchase");
  return true;
}

// ---------------------------------------------------------------- marketing
export function setMarketing(s: GameState, channelId: string, amount: number) {
  const ch = CHANNELS.find((c) => c.id === channelId);
  if (!ch) return;
  s.marketing[channelId] = amount <= 0 ? 0 : Math.max(ch.minSpend, Math.min(ch.maxSpend, Math.round(amount)));
}

// ---------------------------------------------------------------- upgrades
export function buyUpgrade(s: GameState, id: string): boolean {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u || s.upgrades.includes(id)) return false;
  if (u.requires?.some((r) => !s.upgrades.includes(r))) return false;
  if ((u.minEmployees ?? 0) > s.employees.length) return false;
  if (!spend(s, u.cost, `Upgrade: ${u.name}`)) { toast(s, "Not enough cash", "bad"); return false; }
  s.upgrades.push(id);
  if (id === "branding") s.brand = Math.min(100, s.brand + 10);
  log(s, `Adopted upgrade: ${u.name}.`, "purchase");
  return true;
}

// ---------------------------------------------------------------- finance
export function takeLoan(s: GameState, loanId: string): boolean {
  const def = FINANCE.loans.find((l) => l.id === loanId);
  if (!def) return false;
  if (s.loans.filter((l) => l.balance > 0).length >= 2) { toast(s, "Lenders say you're overextended (max 2 active loans)", "bad"); return false; }
  const totalOwed = def.principal * (1 + def.ratePerYear * (def.termDays / 365));
  s.loans.push({
    id: s.nextId++, name: def.name, principal: def.principal, balance: def.principal,
    ratePerYear: def.ratePerYear, dailyPayment: +(totalOwed / def.termDays).toFixed(2), takenOn: s.day,
  });
  s.cash += def.principal;
  toast(s, `+${money(def.principal)} — ${def.name}`, "info");
  log(s, `Took a ${def.name} of ${money(def.principal)}.`, "event");
  return true;
}

export function resolveChoice(s: GameState, optionId: string) {
  if (!s.pendingChoice) return;
  const ev = s.pendingChoice;
  s.pendingChoice = null;
  applyEvent(s, ev.eventId, optionId);
}

// ---------------------------------------------------------------- offline
export interface OfflineSummary { days: number; revenue: number; expenses: number; jobs: number; reviews: number }

export function runOffline(s: GameState, nowMs: number): OfflineSummary | null {
  const away = nowMs - s.lastRealTime;
  const days = Math.min(OFFLINE.capDays, Math.floor(away / OFFLINE.msPerDayAway));
  s.lastRealTime = nowMs;
  if (days < 1 || s.day < 3) return null;
  const r0 = s.lifetimeRevenue, e0 = s.lifetimeExpenses, j0 = s.lifetimeJobs, rv0 = s.reviews.length + 0;
  const rvIds = new Set(s.reviews.map((r) => r.id));
  for (let i = 0; i < days; i++) advanceDayAuto(s);
  return {
    days,
    revenue: s.lifetimeRevenue - r0,
    expenses: s.lifetimeExpenses - e0,
    jobs: s.lifetimeJobs - j0,
    reviews: s.reviews.filter((r) => !rvIds.has(r.id)).length + Math.max(0, rv0 - s.reviews.length) * 0,
  };
}
