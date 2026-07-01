/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  async redirects() {
    return [
      // ensure the service worker is served directly (no redirects)
      // if you have a custom basePath or assetPrefix, adjust accordingly
    ];
  },
  // Serve the service worker from public/ with no middleware interference
  // If you use basePath, you may need to set sw path to `${basePath}/sw.js`
};

export default config;
