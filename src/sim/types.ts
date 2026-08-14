// All simulation state lives in GameState. The engine mutates a draft of it
// once per simulated day. UI reads it and dispatches player actions.

export type Difficulty = "casual" | "standard" | "hard";

export type CustomerType =
  | "budget"
  | "normal"
  | "premium"
  | "difficult"
  | "loyal"
  | "commercial";

export type ServiceId = "driveway" | "softwash" | "windows" | "gutters" | "commercial";

export type Trait =
  | "fastLearner"
  | "perfectionist"
  | "lazy"
  | "naturalLeader"
  | "unreliable"
  | "peoplePerson"
  | "efficient"
  | "detailOriented";

export interface Customer {
  id: number;
  name: string;
  type: CustomerType;
  jobsDone: number;
  lastQuality: number; // 0-100 of last completed job
  churned: boolean;
}

export type JobStatus = "offered" | "scheduled" | "inProgress" | "done" | "rejected" | "expired";

export interface Job {
  id: number;
  customerId: number;
  customerName: string;
  customerType: CustomerType;
  service: ServiceId;
  value: number; // payout
  hours: number; // labor-hours required
  difficulty: number; // 0-100
  expectation: number; // quality bar 0-100
  offeredOn: number; // day index
  expiresOn: number;
  status: JobStatus;
  assignedTo: number[]; // employee ids; -1 = owner
  progress: number; // hours worked
  quality?: number;
  fromReferral?: boolean;
}

export interface Employee {
  id: number;
  name: string;
  age: number;
  wage: number; // per day
  wageAsk: number; // for candidates
  skill: number; // 0-100
  speed: number; // 0-100
  reliability: number; // 0-100
  service: number; // customer service 0-100
  leadership: number; // 0-100
  potential: number; // 0-100 skill cap headroom
  morale: number; // 0-100
  traits: Trait[];
  hiredOn: number;
  trainingDaysLeft: number;
  isManager: boolean;
  daysMissedRecently: number;
  xp: number;
}

export interface Candidate extends Employee {
  appearedOn: number;
  leavesOn: number;
}

export interface EquipmentItem {
  id: string; // tier id from config
  condition: number; // 0-100
  purchasedOn: number;
}

export interface Review {
  id: number;
  day: number;
  stars: number; // 1-5
  text: string;
  customerName: string;
  service: ServiceId;
}

export interface Competitor {
  id: number;
  name: string;
  priceIndex: number; // 1 = market baseline
  reputation: number; // 0-5
  aggression: number; // 0-1 marketing pressure
  alive: boolean;
}

export interface Loan {
  id: number;
  name: string;
  principal: number;
  balance: number;
  ratePerYear: number;
  dailyPayment: number;
  takenOn: number;
}

export interface PendingEventChoice {
  eventId: string;
  title: string;
  body: string;
  options: { id: string; label: string; hint?: string }[];
}

export interface DayStats {
  day: number;
  revenue: number;
  expenses: number;
  jobsDone: number;
  leads: number;
  cash: number;
  employees: number;
  reputation: number;
  brand: number;
}

export interface HistoryEntry {
  day: number;
  text: string;
  kind: "founded" | "milestone" | "hire" | "event" | "purchase" | "info";
}

export interface Toast {
  id: number;
  text: string;
  tone: "good" | "bad" | "info";
  day: number;
}

export interface GameState {
  version: number;
  seed: number;
  rngState: number;

  companyName: string;
  founderName: string;
  difficulty: Difficulty;

  day: number; // days since founding; day 0 = founding date
  startEpoch: number; // ms epoch of founding date (for calendar display)
  lastRealTime: number; // ms epoch when last saved (offline progress)
  speed: 0 | 1 | 2 | 4;

  cash: number;
  lifetimeRevenue: number;
  lifetimeExpenses: number;
  lifetimeJobs: number;

  prices: Record<ServiceId, number>; // price index per service, 0.6–1.8
  unlockedServices: ServiceId[];

  customers: Customer[];
  jobs: Job[];
  nextId: number;

  employees: Employee[];
  candidates: Candidate[];
  ownerFatigue: number; // 0-100, rises when owner works too much

  equipment: EquipmentItem[];
  vehicles: number; // count of vans (simple V1 vehicle model)

  marketing: Record<string, number>; // channelId -> daily budget
  brand: number; // 0-100 awareness
  reputation: number; // 0-5
  reviews: Review[];
  referralCredits: number; // queued referral leads

  competitors: Competitor[];
  marketHeat: number; // 0.6–1.4 demand multiplier (economy cycles)

  loans: Loan[];
  upgrades: string[]; // owned upgrade ids

  pendingChoice: PendingEventChoice | null;

  stats: DayStats[]; // rolling daily stats (capped)
  weekRevenue: number;
  weekExpenses: number;
  monthRevenue: number;
  monthExpenses: number;

  milestones: string[]; // achieved milestone ids
  history: HistoryEntry[];
  toasts: Toast[];

  tutorialStep: number; // -1 = done
  debugUnlocked: boolean;
}
