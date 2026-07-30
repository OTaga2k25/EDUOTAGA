import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@eduotaga/types', '@eduotaga/constants', '@eduotaga/utils', '@eduotaga/ui'],
  allowedDevOrigins: ['10.53.16.203', '10.53.22.6', '10.53.58.209'],
};

export default nextConfig;
