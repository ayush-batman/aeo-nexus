import { assertProductionConvexTarget } from './lib/release/convex-target.mjs';

assertProductionConvexTarget(process.env);

/** @type {import("next").NextConfig} */
const nextConfig = { agentRules: false };
export default nextConfig;
