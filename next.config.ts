import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverRuntimeConfig: {
    // Will only be available on the server side
    GOOGLE_TRANSLATE_API_KEY: process.env.GOOGLE_TRANSLATE_API_KEY,
    GOOGLE_APPLICATION_CREDENTIALS_JSON: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    FMP_API_KEY: process.env.FMP_API_KEY,
    CRON_SECRET_TOKEN: process.env.CRON_SECRET_TOKEN,
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    staticFolder: '/static',
  },
  // Exclude test files from the build
  webpack: (config, { dev, isServer }) => {
    // Only apply in production builds
    if (!dev) {
      config.module.rules.push({
        test: /\.(spec|test)\.(js|ts|tsx)$/,
        loader: 'ignore-loader',
      });
      
      config.module.rules.push({
        test: /__tests__/,
        loader: 'ignore-loader',
      });
    }
    
    return config;
  },
};

export default nextConfig;
