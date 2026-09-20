import { PLAN_CATALOG, type StoredPlanKey } from './billing/plan-catalog';

export const PLAN_LIMITS: Record<StoredPlanKey, { scans: number; threads: number; members: number }> = Object.fromEntries(
  Object.entries(PLAN_CATALOG).map(([key, plan]) => [key, {
    scans: plan.scanRuns,
    threads: plan.forumThreads,
    members: plan.members,
  }]),
) as Record<StoredPlanKey, { scans: number; threads: number; members: number }>;

export const PLAN_PRICES: Record<StoredPlanKey, { amount: number; name: string; display: string }> = Object.fromEntries(
  Object.entries(PLAN_CATALOG).map(([key, plan]) => [key, {
    amount: plan.amountPaise,
    name: plan.name,
    display: plan.priceLabel,
  }]),
) as Record<StoredPlanKey, { amount: number; name: string; display: string }>;
