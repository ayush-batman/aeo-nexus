import { convexBetterAuthNextJs } from '@convex-dev/better-auth/nextjs';

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name}_not_configured`);
  return value;
}

export const {
  handler,
  preloadAuthQuery,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl: requiredEnvironment('NEXT_PUBLIC_CONVEX_URL'),
  convexSiteUrl: requiredEnvironment('NEXT_PUBLIC_CONVEX_SITE_URL'),
});
