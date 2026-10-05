/** @type {import('next').NextConfig} */
const nextConfig = {
  // Instructs Next.js to transpile your TypeScript monorepo package
  transpilePackages: ["@gooutside/supabase"],
  
  /* You can add any other Next.js 14 config options here */
};

export default nextConfig;
