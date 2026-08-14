export const PLAN_LIMITS: Record<string, { scans: number; threads: number; members: number }> = {
    free: { scans: 10, threads: 20, members: 1 },
    starter: { scans: 100, threads: 200, members: 2 },
    pro: { scans: 500, threads: -1, members: 5 },
    agency: { scans: 2000, threads: -1, members: 15 },
    enterprise: { scans: -1, threads: -1, members: -1 },
};

export const PLAN_PRICES: Record<string, { amount: number; name: string; display: string }> = {
    free: { amount: 0, name: 'Free', display: '₹0' },
    starter: { amount: 499900, name: 'Radar', display: '₹4,999' },
    pro: { amount: 1499900, name: 'Command', display: '₹14,999' },
    agency: { amount: 5000000, name: 'Concierge', display: 'From ₹50,000' },
    enterprise: { amount: 0, name: 'Enterprise', display: 'Custom' },
};
