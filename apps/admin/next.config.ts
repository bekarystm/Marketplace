import type { NextConfig } from "next";

// The admin panel is a client-rendered SPA on top of Supabase (RLS enforces access),
// so server caching features are not used.
const nextConfig: NextConfig = {
  transpilePackages: ["@marketplace/shared"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
