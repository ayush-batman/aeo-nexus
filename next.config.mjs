/** @type {import("next").NextConfig} */
const nextConfig = {
  typescript: {
    // Was `true`, which shipped the app green while hiding real type errors.
    // The codebase now type-checks clean (npx tsc --noEmit), so let genuine
    // type errors fail the build again instead of reaching production.
    ignoreBuildErrors: false,
  },
};
export default nextConfig;
