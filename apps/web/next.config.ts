import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@vetor/core", "@vetor/contracts"],
  serverExternalPackages: [
    "sharp",
    "@resvg/resvg-js",
    "@visioncortex/vtracer",
    "@napi-rs/canvas",
    "pdfjs-dist",
  ],
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
