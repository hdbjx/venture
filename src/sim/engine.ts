import type { Employee, GameState, Job, Review } from "./types";
import {
  BRAND, CUSTOMER_TYPES, DEMAND, DIFFICULTY_MODS, EMPLOYEES, EQUIPMENT_MAINT,
  FINANCE, MARKET, QUALITY, REPUTATION, SERVICES, START, TIME,
} from "../config/balance";
import { CHANNELS, EQUIP_TIERS, EVENTS, MILESTONES, REVIEW_LINES, SERVICE_LABEL } from "../config/content";
import { chance, makeCandidate, makeCustomer, makeJobOffer, pick, ri, rng } from "./gen";

// ---------------------------------------------------------------- utilities
export const money = (n: number) =>
  (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");

export function toast(s: GameState, text: string, tone: "good" | "bad" | "info" = "info") {
  s.toasts.push({ id: s.nextId++, text, tone, day: s.day });
  if (s.toasts.length > 6) s.toasts.shift();
}

export function log(s: GameState, text: string, kind: GameState["history"][number]["kind"] = "info") {
  s.history.push({ day: s.day, text, kind });
  if (s.history.length > TIME.historyCap) s.history.shift();
}

export function earn(s: GameState, amount: number, why?: string) {
  if (amount <= 0) return;
  s.cash += amount;
  s.lifetimeRevenue += amount;
  s.weekRevenue += amount;
  s.monthRevenue += amount;
  dayStat(s).revenue += amount;
  if (why) toast(s, `+${money(amount)} ${why}`, "good");
}

export function spend(s: GameState, amount: number, why?: string, allowNegative = false): boolean {
  if (amount <= 0) return true;
  if (!allowNegative && s.cash < amount) return false;
  s.cash -= amount;
  s.lifetimeExpenses += amount;
  s.weekExpenses += amount;
  s.monthExpenses += amount;
  dayStat(s).expenses += amount;
  if (why) toast(s, `-${money(amount)} ${why}`, "bad");
  return true;
}

function dayStat(s: GameState) {
  let d = s.stats[s.stats.length - 1];
  if (!d || d.day !== s.day) {
    d = { day: s.day, revenue: 0, expenses: 0, jobsDone: 0, leads: 0, cash: s.cash, employees: s.employees.length, reputation: s.reputation, brand: s.brand };
    s.stats.push(d);
    if (s.stats.length > TIME.statsCap) s.stats.shift();
  }
  return d;
}

export const hasUp = (s: GameState, id: string) => s.upgrades.includes(id);
export const bestEquip = (s: GameState) => {
  let best = EQUIP_TIERS[0];
  let cond = 100;
  for (const item of s.equipment) {
    const t = EQUIP_TIERS.find((e) => e.id === item.id)!;
    if (t.tier >= best.tier) { best = t; cond = item.condition; }
  }
  return { tier: best, condition: cond };
};

export const dateOf = (s: GameState, day = s.day) => new Date(s.startEpoch + day * 86400000);
export const fmtDate = (s: GameState, day = s.day) =>
  dateOf(s, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// ------------------------------------------------------------------ demand
function priceIndexAvg(s: GameState) {
  const ids = s.unlockedServices;
  return ids.reduce((a, id) => a + s.prices[id], 0) / ids.length;
}

export function conversionRate(s: GameState): number {
  const priceIdx = priceIndexAvg(s);
  const repBonus = (s.reputation - 3) * DEMAND.reputationConversionBonus;
  const brandBonus = s.brand * DEMAND.brandConversionBonus;
  // premium reputation supports premium pricing: sensitivity softens with rep
  const sensitivity = Math.max(0.4, 1 - (s.reputation - 3) * 0.15);
  const pricePenalty = (priceIdx - 1) * 0.5 * sensitivity;
  const comp = s.competitors.filter((c) => c.alive);
  const avgCompPrice = comp.length ? comp.reduce((a, c) => a + c.priceIndex, 0) / comp.length : 1;
  const compPenalty = Math.max(0, (priceIdx - avgCompPrice)) * DEMAND.competitorPressure;
  let cv = DEMAND.conversionBase + repBonus + brandBonus - pricePenalty - compPenalty;
  if (hasUp(s, "booking")) cv *= 1.15;
  if (hasUp(s, "sched")) cv *= 1.05;
  return Math.min(0.95, Math.max(0.05, cv));
}

export function leadsToday(s: GameState): number {
  const mods = DIFFICULTY_MODS[s.difficulty];
  let leads = DEMAND.organicLeadsBase * (0.5 + s.brand / 60) * (0.6 + s.reputation / 5);
  for (const ch of CHANNELS) {
    const spendAmt = s.marketing[ch.id] ?? 0;
    if (spendAmt <= 0) continue;
    if (ch.needsReputation && s.reputation < ch.needsReputation) continue;
    let eff = ch.eff;
    if (ch.compounding) eff *= 0.6 + s.brand / 50;
    if (hasUp(s, "analytics")) eff *= 1.1;
    leads += eff * Math.sqrt(spendAmt);
  }
  // referral program converts happy history into leads
  const refSpend = s.marketing["referral"] ?? 0;
  if (refSpend > 0 && s.reputation >= 3.5) {
    const happy = s.customers.filter((c) => !c.churned && c.lastQuality >= 70).length;
    leads += Math.min(happy * 0.06, 0.12 * Math.sqrt(refSpend) * (s.reputation - 2.5));
  }
  leads += s.referralCredits;
  s.referralCredits = 0;
  return leads * s.marketHeat * mods.demand;
}

function generateOffers(s: GameState) {
  const open = s.jobs.filter((j) => j.status === "offered").length;
  let cap = DEMAND.maxOpenOffers + (hasUp(s, "sched") ? 2 : 0);
  const leads = leadsToday(s);
  dayStat(s).leads += leads;
  const cv = conversionRate(s);
  let whole = Math.floor(leads);
  if (chance(s, leads - whole)) whole++;
  for (let i = 0; i < whole; i++) {
    if (s.jobs.filter((j) => j.status === "offered").length >= cap) break;
    if (!chance(s, cv)) continue;
    // repeat customers
    const repeatPool = s.customers.filter((c) => !c.churned && c.jobsDone > 0 && c.lastQuality >= 60);
    let customer;
    const repeatBoost = hasUp(s, "crm") ? 1.5 : 1;
    if (repeatPool.length && chance(s, Math.min(0.5, 0.12 * repeatBoost + repeatPool.length * 0.01))) {
      customer = pick(s, repeatPool);
    } else {
      customer = makeCustomer(s);
    }
    const job = makeJobOffer(s, customer);
    if (open + i === 0 && s.day < 3) toast(s, `New job request: ${SERVICE_LABEL[job.service]} — ${money(job.value)}`, "info");
  }
}

// ------------------------------------------------------------------- work
export function laborPool(s: GameState): { id: number; hours: number; skill: number; speed: number; service: number; morale: number }[] {
  const pool: { id: number; hours: number; skill: number; speed: number; service: number; morale: number }[] = [];
  const ownerMarketingHours = CHANNELS.reduce((a, ch) => a + ((s.marketing[ch.id] ?? 0) > 0 ? ch.ownerHours : 0), 0);
  const ownerHours = Math.max(0, START.ownerHoursPerDay - ownerMarketingHours - (s.ownerFatigue > 70 ? 2 : 0));
  pool.push({ id: -1, hours: ownerHours, skill: START.ownerSkill + Math.min(20, s.lifetimeJobs * 0.2), speed: START.ownerSpeed, service: START.ownerService, morale: 100 - s.ownerFatigue / 2 });
  for (const e of s.employees) {
    if (e.trainingDaysLeft > 0) continue;
    const showsUp = chance(s, Math.min(0.99, 0.7 + e.reliability / 300 + e.morale / 500));
    if (!showsUp) { e.daysMissedRecently++; continue; }
    let hrs = 8;
    if (e.traits.includes("lazy")) hrs -= 1;
    if (e.traits.includes("efficient")) hrs += 0.5;
    pool.push({ id: e.id, hours: hrs, skill: e.skill, speed: e.speed, service: e.service, morale: e.morale });
  }
  return pool;
}

function computeQuality(s: GameState, job: Job, workers: { skill: number; service: number; morale: number }[]): number {
  const eq = bestEquip(s);
  const avgSkill = workers.reduce((a, w) => a + w.skill, 0) / workers.length;
  const avgService = workers.reduce((a, w) => a + w.service, 0) / workers.length;
  const avgMorale = workers.reduce((a, w) => a + w.morale, 0) / workers.length;
  let q = QUALITY.base
    + avgSkill * QUALITY.skillWeight
    + eq.tier.quality * QUALITY.equipmentWeight
    + avgMorale * QUALITY.moraleWeight
    + avgService * 0.06
    - job.difficulty * QUALITY.difficultyPenalty;
  if (eq.condition < QUALITY.conditionPenaltyBelow) q -= (QUALITY.conditionPenaltyBelow - eq.condition) * QUALITY.conditionPenalty;
  if (hasUp(s, "sop")) q += 6;
  // manager oversight
  const mgr = s.employees.find((e) => e.isManager && e.trainingDaysLeft === 0);
  if (mgr) q += (mgr.leadership - 50) * 0.12;
  // perfectionists / detail people on the crew
  q += workers.length && s.employees.some((e) => e.traits.includes("perfectionist")) ? 2 : 0;
  q += ri(s, -6, 6);
  return Math.max(5, Math.min(100, q));
}

function workJobs(s: GameState) {
  const pool = laborPool(s);
  const eq = bestEquip(s);
  const speedMult = eq.tier.speedMult * (hasUp(s, "routing") ? 0.9 : 1);
  // crew cap: without vans, only owner-led single crew works; each van enables 2 field workers
  const fieldCap = 1 + s.vehicles * 2 + (s.employees.length ? 1 : 0);
  const active = pool.slice(0, 1 + Math.min(pool.length - 1, fieldCap));
  const scheduled = s.jobs.filter((j) => j.status === "scheduled" || j.status === "inProgress");
  scheduled.sort((a, b) => a.expiresOn - b.expiresOn);
  let ownerWorked = 0;

  for (const job of scheduled) {
    const workers = active.filter((w) => w.hours > 0.25);
    if (!workers.length) break;
    job.status = "inProgress";
    // simple crew: up to 2 workers per job
    const crew = workers.slice(0, 2);
    const speedFactor = crew.reduce((a, w) => a + (0.7 + w.speed / 160), 0);
    const need = job.hours * speedMult - job.progress;
    const available = Math.min(...crew.map((w) => w.hours));
    const spent = Math.min(need / speedFactor, available);
    for (const w of crew) {
      w.hours -= spent;
      if (w.id === -1) ownerWorked += spent;
      const emp = s.employees.find((e) => e.id === w.id);
      if (emp) emp.xp += spent * EMPLOYEES.xpPerHour * (emp.traits.includes("fastLearner") ? 1.5 : 1);
    }
    job.progress += spent * speedFactor;
    // equipment wear
    for (const item of s.equipment) item.condition = Math.max(0, item.condition - spent * EQUIPMENT_MAINT.wearPerHour);

    if (job.progress >= job.hours * speedMult - 0.01) {
      finishJob(s, job, crew);
    }
  }
  s.ownerFatigue = Math.max(0, Math.min(100, s.ownerFatigue + (ownerWorked - 5) * 4));
}

function finishJob(s: GameState, job: Job, crew: { id: number; skill: number; service: number; morale: number }[]) {
  job.status = "done";
  const q = computeQuality(s, job, crew);
  job.quality = q;
  s.lifetimeJobs++;
  dayStat(s).jobsDone++;
  earn(s, job.value, `— ${SERVICE_LABEL[job.service]} completed`);
  const mods = DIFFICULTY_MODS[s.difficulty];
  spend(s, (FINANCE.fuelPerJob + job.value * FINANCE.suppliesPerJobPct * (hasUp(s, "bulk") ? 0.6 : 1)) * mods.costs, undefined, true);

  const cust = s.customers.find((c) => c.id === job.customerId);
  if (cust) { cust.jobsDone++; cust.lastQuality = q; }

  // review
  const gap = q - job.expectation;
  let stars = gap >= 15 ? 5 : gap >= 3 ? 4 : gap >= -8 ? 3 : gap >= -20 ? 2 : 1;
  if (stars <= 2 && hasUp(s, "qc") && chance(s, 0.5)) stars = 3; // QC catches disasters
  if (chance(s, 0.55)) {
    const rev: Review = { id: s.nextId++, day: s.day, stars, text: pick(s, REVIEW_LINES[stars]), customerName: job.customerName, service: job.service };
    s.reviews.push(rev);
    if (s.reviews.length > TIME.reviewsCap) s.reviews.shift();
    const w = CUSTOMER_TYPES[job.customerType].reviewWeight;
    s.reputation = Math.max(1, Math.min(5, s.reputation + (stars - s.reputation) * REPUTATION.blend * w));
    if (stars === 5) toast(s, "New 5★ review!", "good");
    if (stars <= 2) toast(s, `New ${stars}★ review — reputation dropped`, "bad");
    if (stars >= 4) s.brand = Math.min(BRAND.max, s.brand + BRAND.perReviewStarAboveThree * (stars - 3));
  }
  s.brand = Math.min(BRAND.max, s.brand + BRAND.perJob);
  if (q >= 75 && chance(s, 0.2)) s.referralCredits += 1;
}

// --------------------------------------------------------------- expenses
function dailyFinance(s: GameState) {
  const mods = DIFFICULTY_MODS[s.difficulty];
  // loans
  for (const loan of s.loans) {
    if (loan.balance <= 0) continue;
    const pay = Math.min(loan.dailyPayment, loan.balance + loan.balance * (loan.ratePerYear / 365));
    loan.balance = Math.max(0, loan.balance * (1 + loan.ratePerYear / 365) - pay);
    spend(s, pay, undefined, true);
    if (loan.balance <= 0) toast(s, `${loan.name} fully repaid`, "good");
  }
  // marketing spend
  let mkt = 0;
  for (const ch of CHANNELS) mkt += s.marketing[ch.id] ?? 0;
  if (mkt > 0) spend(s, mkt, undefined, true);

  const dow = s.day % 7;
  // payroll fridays
  if (dow === FINANCE.payrollDayOfWeek && s.employees.length) {
    const payroll = s.employees.reduce((a, e) => a + e.wage * FINANCE.payrollEveryDays, 0);
    const ok = spend(s, payroll, `Payroll (${s.employees.length} employees)`, true);
    if (s.cash < 0) {
      toast(s, "You missed payroll — morale is collapsing!", "bad");
      for (const e of s.employees) e.morale = Math.max(0, e.morale - 25);
    } else if (ok) {
      for (const e of s.employees) e.morale = Math.min(100, e.morale + 2);
    }
  }
  if (dow === 3 && s.employees.length) toast(s, "Payroll due tomorrow: " + money(s.employees.reduce((a, e) => a + e.wage * 7, 0)), "info");

  // monthly fixed costs on day-of-month 1
  if (dateOf(s).getDate() === 1) {
    const fixed = (FINANCE.monthlyFixedBase + s.vehicles * FINANCE.vehicleMonthly) * mods.costs;
    spend(s, fixed, "Monthly fixed costs", true);
    s.monthRevenue = 0;
    s.monthExpenses = 0;
  }
  if (dow === 0) { s.weekRevenue = 0; s.weekExpenses = 0; }

  if (s.cash < FINANCE.lowCashWarn && s.cash >= 0) toast(s, "Low cash warning", "bad");
  if (s.cash < 0) toast(s, `You're ${money(-s.cash)} in the red — creditors are circling`, "bad");
}

// --------------------------------------------------------------- people
function peopleTick(s: GameState) {
  const workload = s.jobs.filter((j) => j.status === "scheduled" || j.status === "inProgress").length;
  const perHead = workload / Math.max(1, s.employees.length + 1);
  for (const e of s.employees) {
    if (e.trainingDaysLeft > 0) {
      e.trainingDaysLeft--;
      if (e.trainingDaysLeft === 0) {
        const gain = EMPLOYEES.trainingSkillGain * (hasUp(s, "onboard") ? 1.5 : 1) * (e.traits.includes("fastLearner") ? 1.4 : 1);
        e.skill = Math.min(e.potential, e.skill + gain);
        e.service = Math.min(95, e.service + 3);
        toast(s, `${e.name} finished training (+skill)`, "good");
      }
      continue;
    }
    // morale drift
    let target = EMPLOYEES.moraleDriftTarget;
    target += ((e.wage - e.wageAsk) / Math.max(1, e.wageAsk)) * EMPLOYEES.moralePayFactor * 4;
    if (perHead > 2.2) target -= 12;
    const mgr = s.employees.find((m) => m.isManager);
    if (mgr && mgr.id !== e.id) target += (mgr.leadership - 50) * 0.15;
    if (s.cash < 0) target -= 20;
    e.morale += (Math.max(5, Math.min(95, target)) - e.morale) * 0.08;

    // xp -> skill growth
    if (e.xp >= 40 && e.skill < e.potential) {
      e.xp -= 40;
      e.skill = Math.min(e.potential, e.skill + 1);
      if (e.skill % 10 === 0) toast(s, `${e.name} leveled up (skill ${e.skill})`, "good");
    }
    // weekly program training
    if (hasUp(s, "trainprog") && s.day % 7 === 2) e.skill = Math.min(e.potential, e.skill + 0.5);

    // quitting
    if (e.morale < EMPLOYEES.quitBelowMorale && chance(s, EMPLOYEES.quitChancePerDay)) {
      s.employees = s.employees.filter((x) => x.id !== e.id);
      toast(s, `${e.name} quit.`, "bad");
      log(s, `${e.name} quit the company.`, "event");
    }
  }
  // candidates appear / leave
  s.candidates = s.candidates.filter((c) => c.leavesOn > s.day);
  if (s.day % EMPLOYEES.candidateEveryDays === 2 && s.candidates.length < EMPLOYEES.maxCandidates) {
    makeCandidate(s);
    toast(s, "New job applicant available", "info");
  }
}

// --------------------------------------------------------------- market
function marketTick(s: GameState) {
  s.brand = Math.max(0, s.brand - BRAND.decayPerDay * (hasUp(s, "branding") ? 0.75 : 1));
  for (const ch of CHANNELS) {
    const sp = s.marketing[ch.id] ?? 0;
    if (sp > 0) s.brand = Math.min(BRAND.max, s.brand + sp * ch.brandPerDollar * (hasUp(s, "branding") ? 1.25 : 1));
  }
  // market heat random walk
  s.marketHeat = Math.max(MARKET.heatMin, Math.min(MARKET.heatMax, s.marketHeat + (rng(s) - 0.5) * MARKET.heatDrift * 2));
  // competitors drift
  for (const c of s.competitors) {
    if (!c.alive) continue;
    if (chance(s, 0.02)) c.priceIndex = Math.max(0.6, Math.min(1.6, c.priceIndex + (rng(s) - 0.5) * 0.2));
    if (chance(s, 0.01)) c.reputation = Math.max(1.5, Math.min(5, c.reputation + (rng(s) - 0.5) * 0.4));
  }
  // expire offers
  for (const j of s.jobs) {
    if (j.status === "offered" && s.day >= j.expiresOn) j.status = "expired";
  }
  // prune old jobs to keep state small
  if (s.jobs.length > 400) s.jobs = s.jobs.filter((j) => j.status === "offered" || j.status === "scheduled" || j.status === "inProgress" || s.day - j.offeredOn < 30);
}

// --------------------------------------------------------------- events
function maybeEvent(s: GameState) {
  if (s.pendingChoice) return;
  if (s.day < 5) return;
  if (!chance(s, 0.13)) return;
  const mods = DIFFICULTY_MODS[s.difficulty];
  const pool = EVENTS.filter((e) => (e.minDay ?? 0) <= s.day && (e.minEmployees ?? 0) <= s.employees.length);
  let total = 0;
  const weighted = pool.map((e) => { const w = e.weight * (e.bad ? mods.eventBad : 1); total += w; return [e, w] as const; });
  let r = rng(s) * total;
  let ev = pool[0];
  for (const [e, w] of weighted) { r -= w; if (r <= 0) { ev = e; break; } }
  if (!ev) return;

  if (ev.choice) {
    s.pendingChoice = { eventId: ev.id, title: ev.title, body: ev.body, options: ev.choice };
    s.speed = 0;
    return;
  }
  applyEvent(s, ev.id);
  toast(s, ev.title, ev.bad ? "bad" : "good");
  log(s, `${ev.title}: ${ev.body}`, "event");
}

export function applyEvent(s: GameState, id: string, choice?: string) {
  switch (id) {
    case "equipFail": {
      const items = [...s.equipment].sort((a, b) => (EQUIP_TIERS.find((t) => t.id === b.id)!.tier - EQUIP_TIERS.find((t) => t.id === a.id)!.tier));
      if (items[0]) items[0].condition = Math.max(5, items[0].condition - ri(s, 25, 45));
      break;
    }
    case "callout": {
      const e = pick(s, s.employees);
      if (e) { e.daysMissedRecently++; e.morale -= 2; }
      break;
    }
    case "referralBoom": s.referralCredits += ri(s, 2, 4); break;
    case "viral": s.brand = Math.min(100, s.brand + ri(s, 8, 16)); break;
    case "badReview": if (s.lifetimeJobs < 3) break; s.reputation = Math.max(1, s.reputation - 0.25); break;
    case "supplier": spend(s, ri(s, 80, 220), "Emergency restock", true); break;
    case "slowdown": s.marketHeat = Math.max(MARKET.heatMin, s.marketHeat - 0.2); break;
    case "heatwave": s.marketHeat = Math.min(MARKET.heatMax, s.marketHeat + 0.25); break;
    case "compClose": {
      const alive = s.competitors.filter((c) => c.alive);
      if (alive.length > 1) { pick(s, alive).alive = false; s.referralCredits += 3; }
      break;
    }
    case "compPriceWar": {
      const c = pick(s, s.competitors.filter((x) => x.alive));
      if (c) c.priceIndex = Math.max(0.6, c.priceIndex - 0.25);
      break;
    }
    case "starApplicant": makeCandidate(s, true); break;
    case "weather": {
      for (const j of s.jobs) if (j.status === "scheduled" || j.status === "inProgress") j.expiresOn++;
      break;
    }
    case "bigContract": {
      if (choice === "accept" || choice === "sub") {
        const half = choice === "sub";
        const cust = makeCustomer(s, "commercial");
        const job: Job = {
          id: s.nextId++, customerId: cust.id, customerName: cust.name, customerType: "commercial",
          service: s.unlockedServices.includes("commercial") ? "commercial" : "driveway",
          value: half ? 1300 : 2400, hours: half ? 12 : 24, difficulty: 65, expectation: 70,
          offeredOn: s.day, expiresOn: s.day + 4, status: "scheduled", assignedTo: [], progress: 0,
        };
        s.jobs.push(job);
        toast(s, `Commercial contract scheduled — ${money(job.value)}`, "good");
        log(s, `Signed a commercial contract worth ${money(job.value)}.`, "event");
      }
      break;
    }
    case "raiseAsk": {
      const e = [...s.employees].sort((a, b) => b.skill - a.skill)[0];
      if (!e) break;
      if (choice === "grant") { e.wage = Math.round(e.wage * 1.15); e.wageAsk = e.wage; e.morale = Math.min(100, e.morale + 15); toast(s, `${e.name} got a raise`, "info"); }
      else { e.morale = Math.max(0, e.morale - 20); toast(s, `${e.name} is unhappy`, "bad"); }
      break;
    }
    case "auction": {
      if (choice === "buy") {
        if (spend(s, 1200, "Auction: Professional Package")) {
          s.equipment.push({ id: "pro", condition: ri(s, 60, 85), purchasedOn: s.day });
          unlockServicesForTier(s);
          log(s, "Won a Professional Package at auction for $1,200.", "purchase");
        } else toast(s, "Not enough cash for the auction", "bad");
      }
      break;
    }
  }
}

export function unlockServicesForTier(s: GameState) {
  const { tier } = bestEquip(s);
  for (const svc of SERVICES) {
    if (svc.minEquipTier <= tier.tier && !s.unlockedServices.includes(svc.id)) {
      s.unlockedServices.push(svc.id);
      toast(s, `New service unlocked: ${svc.name}`, "good");
      log(s, `Unlocked service: ${svc.name}.`, "info");
    }
  }
}

// --------------------------------------------------------------- milestones
function checkMilestones(s: GameState) {
  const has = (id: string) => s.milestones.includes(id);
  const grant = (id: string) => {
    s.milestones.push(id);
    const label = MILESTONES.find((m) => m.id === id)!.label;
    toast(s, `Milestone: ${label}`, "good");
    log(s, `Milestone reached — ${label}.`, "milestone");
  };
  if (!has("firstJob") && s.lifetimeJobs >= 1) grant("firstJob");
  if (!has("rev1k") && s.lifetimeRevenue >= 1000) grant("rev1k");
  if (!has("firstHire") && s.employees.length >= 1) grant("firstHire");
  if (!has("fiveStar") && s.reviews.some((r) => r.stars === 5)) grant("fiveStar");
  if (!has("month10k") && s.monthRevenue >= 10000) grant("month10k");
  if (!has("firstVan") && s.vehicles >= 1) grant("firstVan");
  if (!has("rev100k") && s.lifetimeRevenue >= 100000) grant("rev100k");
  if (!has("team10") && s.employees.length >= 10) grant("team10");
  if (!has("firstManager") && s.employees.some((e) => e.isManager)) grant("firstManager");
  if (!has("rev1m") && s.lifetimeRevenue >= 1000000) grant("rev1m");
}

// --------------------------------------------------------------- main tick
export function advanceDay(s: GameState) {
  s.day++;
  dayStat(s); // open today's record
  generateOffers(s);
  workJobs(s);
  peopleTick(s);
  dailyFinance(s);
  marketTick(s);
  maybeEvent(s);
  checkMilestones(s);
  const d = dayStat(s);
  d.cash = s.cash;
  d.employees = s.employees.length;
  d.reputation = s.reputation;
  d.brand = s.brand;
}

// Fast/quiet simulation for offline progress: auto-accept what fits capacity.
export function advanceDayAuto(s: GameState) {
  // accept offered jobs up to a sane backlog
  const backlog = s.jobs.filter((j) => j.status === "scheduled" || j.status === "inProgress").length;
  const capacity = laborPool(s).reduce((a, w) => a + w.hours, 0) / 3;
  for (const j of s.jobs) {
    if (j.status === "offered" && backlog < capacity) j.status = "scheduled";
  }
  const before = s.toasts.length;
  advanceDay(s);
  s.toasts.length = Math.min(s.toasts.length, before); // silence toasts offline
}
