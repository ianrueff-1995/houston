import type { NextConfig } from "next";
import createWithVercelToolbar from "@vercel/toolbar/plugins/next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Shows the Vercel toolbar on localhost once the project is linked (`vercel link`).
const withVercelToolbar = createWithVercelToolbar();

export default withVercelToolbar(nextConfig);
