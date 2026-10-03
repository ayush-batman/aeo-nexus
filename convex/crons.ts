import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';
const crons = cronJobs();
crons.interval('dispatch due scans', { minutes: 1 }, internal.scheduled.dispatch, {});
crons.interval('reconcile onboarding measurements', { minutes: 1 }, internal.scheduled.reconcileInitialJobs, {});
crons.weekly('prepare weekly decision digest', {dayOfWeek:'monday',hourUTC:8,minuteUTC:0}, internal.weekly.dispatch, {kind:'weekly_digest'});
crons.weekly('prepare sentiment snapshots', {dayOfWeek:'monday',hourUTC:9,minuteUTC:0}, internal.weekly.dispatch, {kind:'sentiment_drift'});
export default crons;
