import type { Candidate, Competitor, Customer, CustomerType, GameState, Job, ServiceId, Trait } from "./types";
import { CUSTOMER_TYPES, DEMAND, EMPLOYEES, SERVICES, DIFFICULTY_MODS } from "../config/balance";
import { COMPETITOR_NAMES, FIRST_NAMES, LAST_NAMES } from "../config/content";

// Mulberry32 — deterministic, serializable via rngState.
export function rng(s: GameState): number {
  let t = (s.rngState += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const ri = (s: GameState, min: number, max: number) => Math.floor(rng(s) * (max - min + 1)) + min;
export const pick = <T,>(s: GameState, arr: T[]): T => arr[Math.floor(rng(s) * arr.length)];
export const chance = (s: GameState, p: number) => rng(s) < p;

export function personName(s: GameState): string {
  return `${pick(s, FIRST_NAMES)} ${pick(s, LAST_NAMES)}`;
}

export function pickCustomerType(s: GameState): CustomerType {
  const entries = Object.entries(CUSTOMER_TYPES) as [CustomerType, { weight: number }][];
  let total = 0;
  const weights = entries.map(([id, def]) => {
    let w = def.weight;
    if (id === "premium" && s.upgrades.includes("premiumSrv")) w *= 2;
    if (id === "loyal" && s.upgrades.includes("loyalty")) w *= 1.8;
    total += w;
    return [id, w] as const;
  });
  let r = rng(s) * total;
  for (const [id, w] of weights) {
    r -= w;
    if (r <= 0) return id;
  }
  return "normal";
}

export function makeCustomer(s: GameState, type?: CustomerType): Customer {
  const c: Customer = {
    id: s.nextId++,
    name: personName(s),
    type: type ?? pickCustomerType(s),
    jobsDone: 0,
    lastQuality: 0,
    churned: false,
  };
  s.customers.push(c);
  return c;
}

function pickService(s: GameState, type: CustomerType): ServiceId {
  const avail = SERVICES.filter((sv) => s.unlockedServices.includes(sv.id));
  if (type === "commercial") {
    const com = avail.find((a) => a.id === "commercial");
    if (com) return com.id;
  }
  const pool = avail.filter((a) => a.id !== "commercial" || type === "commercial");
  return pick(s, pool.length ? pool : avail).id;
}

export function makeJobOffer(s: GameState, customer: Customer, fromReferral = false): Job {
  const svcId = pickService(s, customer.type);
  const svc = SERVICES.find((x) => x.id === svcId)!;
  const tdef = CUSTOMER_TYPES[customer.type];
  const priceIdx = s.prices[svc.id];
  const sizeVar = 0.8 + rng(s) * 0.5; // job size variance
  const value = Math.round(svc.basePrice * priceIdx * tdef.valueMult * sizeVar);
  const job: Job = {
    id: s.nextId++,
    customerId: customer.id,
    customerName: customer.name,
    customerType: customer.type,
    service: svc.id,
    value,
    hours: +(svc.hours * sizeVar).toFixed(1),
    difficulty: Math.min(95, svc.difficulty + ri(s, -10, 15)),
    // higher price => higher expectations
    expectation: Math.min(95, Math.round(tdef.expectation + (priceIdx - 1) * 25 + ri(s, -5, 5))),
    offeredOn: s.day,
    expiresOn: s.day + DEMAND.jobOfferLifeDays,
    status: "offered",
    assignedTo: [],
    progress: 0,
    fromReferral,
  };
  s.jobs.push(job);
  return job;
}

const TRAITS: Trait[] = ["fastLearner", "perfectionist", "lazy", "naturalLeader", "unreliable", "peoplePerson", "efficient", "detailOriented"];

export function makeCandidate(s: GameState, exceptional = false): Candidate {
  const skill = exceptional ? ri(s, 60, 85) : ri(s, 15, 65);
  const traits: Trait[] = [];
  const n = chance(s, 0.6) ? 1 : chance(s, 0.5) ? 2 : 0;
  while (traits.length < n) {
    const t = pick(s, TRAITS);
    if (!traits.includes(t)) traits.push(t);
  }
  const mods = DIFFICULTY_MODS[s.difficulty];
  const wageAsk = Math.round((EMPLOYEES.wageBase + skill * EMPLOYEES.wagePerSkillPoint + ri(s, -8, 12)) * mods.wageAsk);
  const cand: Candidate = {
    id: s.nextId++,
    name: personName(s),
    age: ri(s, 18, 52),
    wage: wageAsk,
    wageAsk,
    skill,
    speed: ri(s, 25, exceptional ? 90 : 75),
    reliability: traits.includes("unreliable") ? ri(s, 20, 45) : ri(s, 45, 95),
    service: traits.includes("peoplePerson") ? ri(s, 65, 95) : ri(s, 25, 80),
    leadership: traits.includes("naturalLeader") ? ri(s, 60, 95) : ri(s, 10, 60),
    potential: traits.includes("fastLearner") ? ri(s, 70, 98) : ri(s, Math.min(95, skill + 5), 95),
    morale: 70,
    traits,
    hiredOn: -1,
    trainingDaysLeft: 0,
    isManager: false,
    daysMissedRecently: 0,
    xp: 0,
    appearedOn: s.day,
    leavesOn: s.day + EMPLOYEES.candidateStayDays,
  };
  s.candidates.push(cand);
  return cand;
}

export function makeCompetitors(s: GameState): void {
  const count = 3;
  for (let i = 0; i < count; i++) {
    const c: Competitor = {
      id: s.nextId++,
      name: COMPETITOR_NAMES[i],
      priceIndex: 0.85 + rng(s) * 0.4,
      reputation: 2.6 + rng(s) * 1.6,
      aggression: 0.2 + rng(s) * 0.5,
      alive: true,
    };
    s.competitors.push(c);
  }
}
