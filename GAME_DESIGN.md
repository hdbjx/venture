# VentureBuilt — Game Design

## Core loop

**Marketing → Leads → Job requests → Scheduling → Quality → Reviews → Reputation → Better leads & pricing power.**

Cash is the constraint at every stage: marketing, wages, equipment, upgrades and maintenance all compete for it, and payroll + loan payments + monthly fixed costs come out whether revenue arrives or not.

Phase transitions the design targets:

- **Early:** the owner does everything. 8 hours/day, split between working jobs and door-to-door marketing. Every $100 matters.
- **Mid:** employees + a van multiply capacity, but payroll turns cash flow into a real problem. Quality control and morale start to bite.
- **Late:** managers, training programs, tech upgrades and brand carry the load; the player manages systems, not jobs.

## Time

1 tick = 1 simulated day. Speeds: pause / 1× (2s per day) / 2× / 4×, plus a "+1 day" step. Decision events pause the clock. Everything (jobs, payroll, morale, events, market drift) advances per tick — nothing is wall-clock-timed, so the game is fully playable in short active sessions.

## Demand & conversion

Leads/day = organic (scales with brand & reputation) + Σ per-channel `eff × √spend` × situational modifiers, all × market heat × difficulty demand modifier. Referral program converts your stock of happy customers into leads.

Leads become job offers at:

```
conv = 0.55
     + (reputation − 3) × 0.08
     + brand × 0.002
     − (priceIndex − 1) × 0.5 × sensitivity        // sensitivity shrinks as reputation grows
     − max(0, priceIndex − avgCompetitorPrice) × 0.25
     × upgrade multipliers (online booking +15%, scheduling +5%)
clamped to [5%, 95%]
```

Key consequence: **premium pricing only works once reputation supports it**, and undercutting competitors buys volume you may not have the labor to serve.

## Jobs & quality

Each offer carries value, labor-hours, difficulty, and an expectation bar (higher price index ⇒ higher expectations). Accepted jobs consume crew labor-hours daily; crews of up to 2 work a job, vans gate how many employees can be in the field (1 + 2/van + 1 if you have any employee).

```
quality = 20 + avgSkill×0.55 + equipQuality×22 + avgMorale×0.12 + avgService×0.06
        − difficulty×0.22 − wornEquipmentPenalty + SOP(+6) + managerLeadership bonus ± noise
```

Review stars come from `quality − expectation` (≥+15 ⇒ 5★ … ≤−20 ⇒ 1★); QC upgrade halves disaster reviews. Reputation is an exponential moving average of stars, weighted by customer type (premium/difficult reviews move it more).

**The overbooking trap:** accepting everything looks profitable but starves each job of fresh crews, wears equipment (condition decays 0.45/labor-hour), and tanks quality → reputation → conversion. The headless sim confirms it: an accept-everything bot ends at ~2.4★ and broke; a disciplined bot that caps backlog, maintains gear and trains ends at ~3.8★ with growing cash.

## Customers

Six types (budget / normal / premium / difficult / loyal / commercial) with different value, expectations, price sensitivity, repeat chance and review weight — see `config/balance.ts → CUSTOMER_TYPES`. Customers persist, remember last quality, and can return (CRM upgrade +50% repeat pull; good jobs also queue referral leads).

## Employees

Individually generated: wage ask (skill-driven ± market), skill/speed/reliability/service/leadership/potential, morale, and 0–2 traits with mechanical effects (unreliable ⇒ low reliability roll each day; lazy −1h/day; fast learner ×1.5 XP and better training; natural leader ⇒ manager material; etc.). Reliability + morale set daily show-up chance. XP from worked hours converts to skill up to `potential`. Training = 5 days off the schedule + $450 for skill/service gains. Morale drifts toward a target set by pay-vs-ask, workload per head, manager leadership, and solvency; <22 morale risks quitting, missed payroll craters everyone.

## Money

- Payroll every Friday (with a Thursday warning toast).
- Monthly fixed costs on the 1st (+$260/mo per van).
- Per-job fuel + supplies (bulk purchasing −40% supplies).
- Loans: 3 products, daily amortized payments, max 2 active. Cash can go negative (with escalating warnings and morale damage) rather than instant game over.

## Difficulty

Multipliers, not price doubling: demand ×1.2/1.0/0.85, costs ×0.85/1.0/1.15, bad-event weight ×0.7/1.0/1.3, wage asks ×0.9/1.0/1.1, starting cash 1500/1000/700.

## Events

~13% chance/day after day 5, weighted pool with prerequisites (day, headcount) and difficulty-scaled bad-event weights. Decision events (commercial contract, raise request, equipment auction) pause the clock and branch.

## Progression & milestones

10 milestones from "first job" to "$1M lifetime revenue", each toasted and written to the permanent company history timeline. No prestige: one long company. Late-game pressure comes from payroll scale, morale management, equipment wear at volume, competitor drift and market heat rather than bigger numbers.

## Balance constants

Everything lives in `src/config/balance.ts` (economy) and `src/config/content.ts` (equipment tiers, channels, upgrades, events, names). `npm run simtest` runs 120-day strategy comparisons + a 3-year perf run and asserts invariants (finite cash, bounded reputation, bounded state size, smart > idle) — use it after any balance change.

## Future expansion ideas

- Territories/markets with distinct customer mixes; physical locations with capacity.
- Per-crew assignment UI and multi-crew routing; vehicles as individual entities (used/new/lease).
- Competitor AI that reacts to your price/reputation; market share readout.
- Industry packs (services are already data-driven via `SERVICES`).
- Deeper manager layer (one manager per crew), company culture stat, employee reviews.
- Seasonal demand curves; taxes as a quarterly event.
