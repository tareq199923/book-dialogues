import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker: produce a standalone .next/standalone build
  output: process.env.DOCKER ? "standalone" : undefined,

  // @google/genai uses Node.js APIs — mark as external so it's not bundled
  serverExternalPackages: ["@google/genai"],
};

export default nextConfig;
