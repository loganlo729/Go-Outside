import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Instructs Next.js to transpile your TypeScript monorepo package
  transpilePackages: ["@gooutside/supabase"],
};

export default nextConfig;
