import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@eduotaga/types', '@eduotaga/constants', '@eduotaga/utils', '@eduotaga/ui'],
  allowedDevOrigins: ['10.53.16.203', '10.53.22.6', '10.53.58.209'],

  async headers() {
    return [
      {
        // Apple requires this file to be served as application/json, and it
        // has no file extension for Next to infer the type from.
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
      {
        // Android's verifier is equally strict about the content type.
        source: '/.well-known/assetlinks.json',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ];
  },
};

export default nextConfig;
