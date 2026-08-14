import type { ServiceId } from "../sim/types";

// ----- EQUIPMENT TIERS ------------------------------------------------------
export interface EquipTierDef {
  id: string;
  tier: number;
  name: string;
  price: number;
  quality: number; // 0-1 quality contribution
  speedMult: number; // labor-hour multiplier (lower = faster)
  desc: string;
}

export const EQUIP_TIERS: EquipTierDef[] = [
  { id: "starter", tier: 0, name: "Starter Kit", price: 0, quality: 0.35, speedMult: 1.0, desc: "Consumer-grade washer, ladder, hand tools. It works. Barely." },
  { id: "pro", tier: 1, name: "Professional Package", price: 2400, quality: 0.6, speedMult: 0.85, desc: "Commercial washer, surface cleaner, pro ladders. Unlocks Gutter Clearing." },
  { id: "commercialEq", tier: 2, name: "Commercial Rig", price: 6800, quality: 0.8, speedMult: 0.72, desc: "Softwash system, trailer-mounted rig. Unlocks House Soft Wash." },
  { id: "industrial", tier: 3, name: "Industrial Fleet Gear", price: 16500, quality: 0.95, speedMult: 0.62, desc: "High-flow industrial systems. Unlocks Commercial Wash contracts." },
];

// ----- MARKETING CHANNELS ---------------------------------------------------
export interface ChannelDef {
  id: string;
  name: string;
  minSpend: number;
  maxSpend: number;
  // leads/day ≈ eff * sqrt(spend) * situational modifiers
  eff: number;
  brandPerDollar: number;
  ownerHours: number; // hours of owner time per active day (door-to-door)
  needsReputation?: number; // referral program needs happy customers
  compounding?: boolean; // social grows with brand
  desc: string;
}

export const CHANNELS: ChannelDef[] = [
  { id: "door", name: "Door-to-Door", minSpend: 0, maxSpend: 30, eff: 0.55, brandPerDollar: 0.004, ownerHours: 2, desc: "Free-ish but eats 2 of your own hours per day. Great before you can afford ads." },
  { id: "flyers", name: "Flyers", minSpend: 5, maxSpend: 60, eff: 0.28, brandPerDollar: 0.006, ownerHours: 0, desc: "Cheap, steady trickle of local leads." },
  { id: "social", name: "Social Media", minSpend: 5, maxSpend: 120, eff: 0.2, brandPerDollar: 0.012, ownerHours: 0, compounding: true, desc: "Slow start, compounds with brand awareness." },
  { id: "search", name: "Search Ads", minSpend: 20, maxSpend: 250, eff: 0.42, brandPerDollar: 0.003, ownerHours: 0, desc: "Expensive, reliable, high-intent leads." },
  { id: "referral", name: "Referral Program", minSpend: 5, maxSpend: 80, eff: 0.0, brandPerDollar: 0.002, ownerHours: 0, needsReputation: 3.5, desc: "Pays happy customers to send friends. Needs reputation ≥ 3.5★." },
  { id: "radio", name: "Local Radio", minSpend: 60, maxSpend: 400, eff: 0.3, brandPerDollar: 0.02, ownerHours: 0, desc: "Big brand builder. Only worth it at scale." },
];

// ----- UPGRADES -------------------------------------------------------------
export interface UpgradeDef {
  id: string;
  name: string;
  cat: "Operations" | "Marketing" | "People" | "Technology" | "Customer" | "Finance";
  cost: number;
  requires?: string[];
  minEmployees?: number;
  desc: string;
  effect: string; // human readable; applied in engine via hasUpgrade()
}

export const UPGRADES: UpgradeDef[] = [
  { id: "sop", name: "Standard Operating Procedures", cat: "Operations", cost: 600, desc: "Written checklists for every service.", effect: "+6 base quality on all jobs" },
  { id: "qc", name: "Quality Control System", cat: "Operations", cost: 2200, requires: ["sop"], minEmployees: 2, desc: "Spot-checks and re-do policy.", effect: "Bad-review chance halved" },
  { id: "routing", name: "Route Optimization", cat: "Technology", cost: 1800, requires: ["sched"], desc: "Smart daily routing.", effect: "-10% job hours" },
  { id: "sched", name: "Scheduling Software", cat: "Technology", cost: 700, desc: "No more paper calendar.", effect: "+2 job offer capacity, +5% conversion" },
  { id: "crm", name: "CRM + Follow-Ups", cat: "Customer", cost: 1500, requires: ["sched"], desc: "Automated follow-up emails.", effect: "+50% repeat-customer chance" },
  { id: "booking", name: "Online Booking", cat: "Technology", cost: 1200, requires: ["sched"], desc: "Customers book themselves.", effect: "+15% lead conversion" },
  { id: "branding", name: "Professional Branding", cat: "Marketing", cost: 900, desc: "Logo, uniforms, wrapped gear.", effect: "+10 brand instantly, +25% brand gains" },
  { id: "loyalty", name: "Customer Loyalty Program", cat: "Customer", cost: 1600, requires: ["crm"], desc: "Discounts for repeat clients.", effect: "Loyal customers spawn more often" },
  { id: "bulk", name: "Bulk Supply Purchasing", cat: "Finance", cost: 1100, desc: "Wholesale chemicals & supplies.", effect: "Supply cost per job -40%" },
  { id: "onboard", name: "Standardized Onboarding", cat: "People", cost: 1300, minEmployees: 1, desc: "New hires ramp fast.", effect: "New hires +8 skill on day one; training +50% effective" },
  { id: "trainprog", name: "Training Program", cat: "People", cost: 2600, requires: ["onboard"], desc: "Recurring skill development.", effect: "All employees slowly gain skill each week" },
  { id: "mgmt", name: "Management Track", cat: "People", cost: 3500, requires: ["trainprog"], minEmployees: 4, desc: "Promote leaders to manager.", effect: "Unlocks promoting managers (team quality & morale boost)" },
  { id: "analytics", name: "Advanced Analytics", cat: "Technology", cost: 2000, requires: ["crm"], desc: "Know your numbers.", effect: "+10% marketing efficiency" },
  { id: "premiumSrv", name: "Premium Service Line", cat: "Operations", cost: 2800, requires: ["sop"], desc: "White-glove option for high-end clients.", effect: "Premium customers appear 2x as often" },
];

// ----- EVENTS ---------------------------------------------------------------
export interface EventDef {
  id: string;
  weight: number;
  bad?: boolean;
  minDay?: number;
  minEmployees?: number;
  title: string;
  body: string;
  choice?: { id: string; label: string; hint?: string }[];
}

export const EVENTS: EventDef[] = [
  { id: "equipFail", weight: 10, bad: true, minDay: 10, title: "Equipment failure", body: "Your washer sputtered and died mid-job. Condition of your best equipment drops sharply." },
  { id: "callout", weight: 10, bad: true, minEmployees: 1, title: "Employee called out", body: "An employee missed their shift today." },
  { id: "referralBoom", weight: 8, title: "Word is spreading", body: "A happy customer told their whole street about you. Bonus leads incoming." },
  { id: "viral", weight: 3, minDay: 20, title: "Viral post", body: "A before/after photo took off locally. Brand awareness jumps." },
  { id: "badReview", weight: 8, bad: true, minDay: 8, title: "Harsh review", body: "A customer posted a scathing 1★ review. Reputation takes a hit." },
  { id: "supplier", weight: 6, bad: true, minDay: 15, title: "Supplier price increase", body: "Chemical costs rise. A surprise restocking bill hits today." },
  { id: "slowdown", weight: 5, bad: true, minDay: 30, title: "Economic slowdown", body: "Local spending is tightening. Demand cools for a while." },
  { id: "heatwave", weight: 6, minDay: 12, title: "Heat wave", body: "Everyone suddenly wants their property cleaned. Demand surges for a while." },
  { id: "compClose", weight: 3, minDay: 45, title: "Competitor closes", body: "A rival shut its doors. Their customers are up for grabs." },
  { id: "compPriceWar", weight: 5, bad: true, minDay: 25, title: "Price war", body: "A competitor slashed prices to steal market share." },
  {
    id: "bigContract", weight: 4, minDay: 25, title: "Commercial opportunity",
    body: "A property manager offers a large contract worth $2,400 — but it needs ~24 labor-hours delivered within 4 days.",
    choice: [
      { id: "accept", label: "Take the contract", hint: "Big payout if you deliver. Reputation hit if you're late." },
      { id: "sub", label: "Subcontract half", hint: "Keep $1,300, only 12 hours needed." },
      { id: "reject", label: "Pass on it", hint: "No risk, no reward." },
    ],
  },
  {
    id: "raiseAsk", weight: 6, minEmployees: 1, title: "Raise request",
    body: "Your most experienced employee asks for a 15% raise.",
    choice: [
      { id: "grant", label: "Grant the raise", hint: "Costs more, morale up." },
      { id: "deny", label: "Deny it", hint: "Save money, morale down, small quit risk." },
    ],
  },
  {
    id: "auction", weight: 3, minDay: 20, title: "Equipment auction",
    body: "A retiring competitor is auctioning a Professional Package for $1,200 (normally $2,400).",
    choice: [
      { id: "buy", label: "Buy it ($1,200)", hint: "Great deal if you have the cash." },
      { id: "skip", label: "Skip", hint: "" },
    ],
  },
  { id: "starApplicant", weight: 4, minDay: 15, title: "Exceptional applicant", body: "A standout candidate just joined your hiring pool. Don't let them slip away." },
  { id: "weather", weight: 7, bad: true, minDay: 5, title: "Storm day", body: "Heavy rain — no outdoor work today. Scheduled jobs slip a day." },
];

// ----- MILESTONES -----------------------------------------------------------
export interface MilestoneDef { id: string; label: string; check: string }
export const MILESTONES: { id: string; label: string }[] = [
  { id: "firstJob", label: "First job completed" },
  { id: "rev1k", label: "$1,000 lifetime revenue" },
  { id: "firstHire", label: "First employee hired" },
  { id: "fiveStar", label: "First 5★ review" },
  { id: "month10k", label: "$10,000 revenue month" },
  { id: "firstVan", label: "First work van" },
  { id: "rev100k", label: "$100,000 lifetime revenue" },
  { id: "team10", label: "10 employees" },
  { id: "firstManager", label: "First manager promoted" },
  { id: "rev1m", label: "$1,000,000 lifetime revenue" },
];

// ----- NAMES ----------------------------------------------------------------
export const FIRST_NAMES = ["Avery","Jordan","Sam","Riley","Casey","Morgan","Quinn","Dana","Reese","Skyler","Marcus","Elena","Priya","Diego","Nia","Owen","Tara","Felix","Ivy","Cole","Maya","Leo","June","Omar","Sasha","Kai","Wren","Theo","Zara","Miles"];
export const LAST_NAMES = ["Whitfield","Okafor","Ramirez","Chen","Novak","Patel","Brooks","Kim","Alvarez","Foster","Nguyen","Hale","Moreau","Silva","Bennett","Cruz","Ellison","Ford","Grant","Hopper","Ivers","Juno","Keller","Lund","Mercer"];
export const COMPETITOR_NAMES = ["BrightSide Exterior Co.", "RapidShine Services", "Summit Property Care", "BlueJay Wash Co.", "Northgate Cleaning Group"];

export const REVIEW_LINES = {
  5: ["Flawless work and super professional.", "Best in the area, hands down.", "Exceeded every expectation."],
  4: ["Great service, would use again.", "Solid job, friendly crew.", "Good work — arrived a bit late, but worth it."],
  3: ["Fine. Nothing special.", "Job got done, communication could improve.", "Okay results for the price."],
  2: ["Sloppy in places. Disappointed.", "Too expensive for what I received.", "Had to point out missed spots."],
  1: ["Would not recommend.", "Poor quality and unprofessional.", "A total letdown."],
} as Record<number, string[]>;

export const SERVICE_LABEL: Record<ServiceId, string> = {
  driveway: "Driveway Wash",
  windows: "Window Cleaning",
  gutters: "Gutter Clearing",
  softwash: "House Soft Wash",
  commercial: "Commercial Wash",
};
