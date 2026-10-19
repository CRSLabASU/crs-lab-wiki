import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lib/content.ts reads files with runtime paths, so the tracer copies the whole
  // project into every server function. Leave out what functions never read:
  // public/ is served by the CDN (its robot videos alone are 250MB+).
  outputFileTracingExcludes: {
    "/*": [
      "public/**/*",
      ".git/**/*",
      "scripts/**/*",
      "package-lock.json",
      "tsconfig.tsbuildinfo",
      "README.md",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
