/** @type {import("next").NextConfig} */
const nextConfig = {
  turbopack: {
    root: ".",
  },
  typescript: {
    // Allow builds to succeed even with type errors (fix incrementally)
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allow builds to succeed even with lint errors
    ignoreDuringBuilds: true,
  },
};
export default nextConfig;
