import type { CustomerType, Difficulty, ServiceId } from "../sim/types";

// ---------------------------------------------------------------------------
// Every tunable number in the simulation lives in this folder.
// ---------------------------------------------------------------------------

export const START = {
  cash: { casual: 1500, standard: 1000, hard: 700 } as Record<Difficulty, number>,
  ownerSkill: 45,
  ownerSpeed: 50,
  ownerService: 55,
  ownerHoursPerDay: 8,
};

export const TIME = {
  msPerDay: { 1: 2000, 2: 1000, 4: 500 } as Record<number, number>,
  statsCap: 730, // keep 2 years of daily stats
  reviewsCap: 60,
  historyCap: 200,
};

export interface ServiceDef {
  id: ServiceId;
  name: string;
  basePrice: number; // market baseline payout at price index 1.0
  hours: number; // base labor-hours
  minEquipTier: number; // equipment tier index required
  difficulty: number;
  unlockedAtStart: boolean;
}

export const SERVICES: ServiceDef[] = [
  { id: "driveway", name: "Driveway Wash", basePrice: 155, hours: 3, minEquipTier: 0, difficulty: 25, unlockedAtStart: true },
  { id: "windows", name: "Window Cleaning", basePrice: 120, hours: 2.5, minEquipTier: 0, difficulty: 30, unlockedAtStart: true },
  { id: "gutters", name: "Gutter Clearing", basePrice: 170, hours: 3.5, minEquipTier: 1, difficulty: 45, unlockedAtStart: false },
  { id: "softwash", name: "House Soft Wash", basePrice: 320, hours: 5, minEquipTier: 2, difficulty: 60, unlockedAtStart: false },
  { id: "commercial", name: "Commercial Wash", basePrice: 900, hours: 12, minEquipTier: 3, difficulty: 70, unlockedAtStart: false },
];

export interface CustomerTypeDef {
  weight: number;
  valueMult: number;
  expectation: number; // base quality bar
  priceSensitivity: number; // how strongly price index reduces conversion
  repeatChance: number; // chance to come back after a good job
  reviewWeight: number; // reputation impact multiplier
}

export const CUSTOMER_TYPES: Record<CustomerType, CustomerTypeDef> = {
  budget: { weight: 30, valueMult: 0.8, expectation: 50, priceSensitivity: 1.6, repeatChance: 0.15, reviewWeight: 0.7 },
  normal: { weight: 34, valueMult: 1.0, expectation: 62, priceSensitivity: 1.0, repeatChance: 0.25, reviewWeight: 1.0 },
  premium: { weight: 12, valueMult: 1.5, expectation: 78, priceSensitivity: 0.5, repeatChance: 0.3, reviewWeight: 1.5 },
  difficult: { weight: 10, valueMult: 1.2, expectation: 85, priceSensitivity: 0.9, repeatChance: 0.1, reviewWeight: 1.3 },
  loyal: { weight: 8, valueMult: 1.0, expectation: 60, priceSensitivity: 0.8, repeatChance: 0.6, reviewWeight: 1.0 },
  commercial: { weight: 6, valueMult: 1.0, expectation: 70, priceSensitivity: 0.7, repeatChance: 0.5, reviewWeight: 1.2 },
};

export const DEMAND = {
  organicLeadsBase: 0.5, // leads/day before marketing, scaled by brand & reputation
  jobOfferLifeDays: 4,
  // conversion: leads -> job offers you actually see
  conversionBase: 0.55,
  reputationConversionBonus: 0.08, // per star above 3
  brandConversionBonus: 0.002, // per brand point
  competitorPressure: 0.25, // how much cheaper competitors dent conversion
  priceIndexMin: 0.6,
  priceIndexMax: 1.8,
  maxOpenOffers: 14,
};

export const QUALITY = {
  base: 20,
  skillWeight: 0.55,
  equipmentWeight: 22, // scaled by tier quality 0-1
  moraleWeight: 0.12,
  fatiguePenalty: 0.35, // per fatigue point over 50
  conditionPenaltyBelow: 60, // equipment condition threshold
  conditionPenalty: 0.3,
  difficultyPenalty: 0.22,
  trainedBonusXpDiv: 60, // xp/this = bonus quality (cap 10)
};

export const EMPLOYEES = {
  wagePerSkillPoint: 1.45, // daily wage ≈ 60 + skill*this
  wageBase: 54,
  candidateEveryDays: 5,
  candidateStayDays: 10,
  maxCandidates: 5,
  trainingCostPerDay: 90,
  trainingDays: 5,
  trainingSkillGain: 6,
  moraleDriftTarget: 65,
  moralePayFactor: 22, // paying above ask raises target
  overworkThreshold: 7.5, // avg hours/day
  quitBelowMorale: 22,
  quitChancePerDay: 0.06,
  raiseAskChance: 0.004, // per employee-day when morale mid
  xpPerHour: 1.0,
};

export const EQUIPMENT_MAINT = {
  wearPerHour: 0.45,
  maintainCostFactor: 0.04, // of purchase price, restores to 100
  brokenBelow: 15,
};

export const FINANCE = {
  payrollEveryDays: 7, // paid on day % 7 === 5 (Fridays, day0=Monday)
  payrollDayOfWeek: 4,
  monthlyFixedBase: 120, // insurance/phone/software floor
  fuelPerJob: 6,
  suppliesPerJobPct: 0.05, // of job value
  vehicleMonthly: 260, // per van (insurance+upkeep)
  vanPrice: 7200,
  lowCashWarn: 250,
  loans: [
    { id: "sba", name: "Small Business Loan", principal: 5000, ratePerYear: 0.14, termDays: 365 },
    { id: "equip", name: "Equipment Financing", principal: 3000, ratePerYear: 0.11, termDays: 270 },
    { id: "loc", name: "Line of Credit Draw", principal: 1500, ratePerYear: 0.19, termDays: 180 },
  ],
};

export const BRAND = {
  decayPerDay: 0.35,
  perReviewStarAboveThree: 0.4,
  perJob: 0.02,
  max: 100,
};

export const REPUTATION = {
  start: 3.0,
  blend: 0.06, // how fast each review moves the average (weighted by reviewWeight)
};

export const DIFFICULTY_MODS: Record<Difficulty, { demand: number; costs: number; eventBad: number; wageAsk: number }> = {
  casual: { demand: 1.2, costs: 0.85, eventBad: 0.7, wageAsk: 0.9 },
  standard: { demand: 1.0, costs: 1.0, eventBad: 1.0, wageAsk: 1.0 },
  hard: { demand: 0.85, costs: 1.15, eventBad: 1.3, wageAsk: 1.1 },
};

export const OFFLINE = {
  capDays: 7,
  msPerDayAway: 1000 * 60 * 60 * 3, // 3 real hours away = 1 sim day
};

export const MARKET = {
  heatMin: 0.7,
  heatMax: 1.3,
  heatDrift: 0.015,
};
