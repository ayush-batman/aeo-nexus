import { MINUTE, RateLimiter } from '@convex-dev/rate-limiter';
import { components } from '../_generated/api';

export const limits = new RateLimiter(components.rateLimiter, {
  measurement: { kind: 'fixed window', rate: 10, period: MINUTE },
  api: { kind: 'fixed window', rate: 120, period: MINUTE },
  publicScan: { kind: 'fixed window', rate: 3, period: MINUTE },
  signup: { kind: 'fixed window', rate: 5, period: MINUTE },
  discovery: { kind: 'fixed window', rate: 5, period: MINUTE },
});
