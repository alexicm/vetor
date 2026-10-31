import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url)), "../.."),
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
