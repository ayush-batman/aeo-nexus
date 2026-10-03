import betterAuth from '@convex-dev/better-auth/convex.config.js';
import rateLimiter from '@convex-dev/rate-limiter/convex.config.js';
import workflow from '@convex-dev/workflow/convex.config.js';
import workpool from '@convex-dev/workpool/convex.config.js';
import { defineApp } from 'convex/server';

const app = defineApp();

app.use(betterAuth);
app.use(rateLimiter);
app.use(workflow);
app.use(workpool, { name: 'measurementWorkpool' });

export default app;
