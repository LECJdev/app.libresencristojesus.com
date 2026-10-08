import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // `@lcj/ui` is exported as TypeScript source (not a compiled bundle) so
  // its `"use client"` directives survive intact — Next compiles it here.
  transpilePackages: ['@lcj/ui'],
};

export default nextConfig;
