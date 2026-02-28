export const PLAN_LIMITS: Record<string, { scans: number; threads: number; members: number }> = {
    free: { scans: 10, threads: 20, members: 1 },
    starter: { scans: 100, threads: 200, members: 2 },
    pro: { scans: 500, threads: -1, members: 5 },
    agency: { scans: 2000, threads: -1, members: 15 },
    enterprise: { scans: -1, threads: -1, members: -1 },
};

export const PLAN_PRICES: Record<string, { amount: number; name: string; display: string }> = {
    free: { amount: 0, name: 'Free Plan', display: '₹0' },
    starter: { amount: 249900, name: 'Starter Plan', display: '₹2,499' },
    pro: { amount: 799900, name: 'Pro Plan', display: '₹7,999' },
    agency: { amount: 1999900, name: 'Agency Plan', display: '₹19,999' },
    enterprise: { amount: 0, name: 'Enterprise Plan', display: 'Custom' },
};
