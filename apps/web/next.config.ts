import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@eduotaga/types', '@eduotaga/constants', '@eduotaga/utils', '@eduotaga/ui'],
};

export default nextConfig;
