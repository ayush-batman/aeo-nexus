const knownTestDeployments = new Set(['woozy-starfish-810']);

function hasExpectedOrigin(value, deployment, suffix) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.hostname === `${deployment}.${suffix}` &&
      !url.port &&
      url.pathname === '/' &&
      !url.search && !url.hash && !url.username && !url.password;
  } catch {
    return false;
  }
}

function isProductionHostname(hostname, environment) {
  if (!hostname) return false;
  const normalized = hostname.toLowerCase();
  return normalized === 'aelohq.com' ||
    normalized === 'www.aelohq.com' ||
    normalized === 'aeo-nexus.vercel.app' ||
    normalized === environment.VERCEL_PROJECT_PRODUCTION_URL?.toLowerCase();
}

/** Stop a Production build before it can bundle a test backend URL. */
export function assertProductionConvexTarget(environment, requestHostname) {
  if (environment.VERCEL_ENV !== 'production' &&
      environment.VERCEL_TARGET_ENV !== 'production' &&
      !isProductionHostname(requestHostname, environment)) return;

  const deployment = environment.AELO_EXPECTED_PRODUCTION_CONVEX_DEPLOYMENT?.trim();
  if (!deployment || !/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(deployment) || knownTestDeployments.has(deployment)) {
    throw new Error('Aelo Production requires a confirmed, non-test Convex deployment');
  }
  if (!hasExpectedOrigin(environment.NEXT_PUBLIC_CONVEX_URL, deployment, 'convex.cloud') ||
      !hasExpectedOrigin(environment.NEXT_PUBLIC_CONVEX_SITE_URL, deployment, 'convex.site')) {
    throw new Error('Aelo Production Convex cloud and site URLs must match the confirmed deployment');
  }
  if (!environment.CONVEX_SERVER_KEY || environment.CONVEX_SERVER_KEY === '[SENSITIVE]') {
    throw new Error('Aelo Production requires its matching Convex server key');
  }
}
