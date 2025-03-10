declare module 'next-pwa' {
  import { NextConfig } from 'next';
  
  type PWAConfig = {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    runtimeCaching?: any[];
    buildExcludes?: Array<string | RegExp>;
    scope?: string;
    sw?: string;
  };
  
  export default function withPWA(pwaConfig?: PWAConfig): 
    (nextConfig?: NextConfig) => NextConfig;
} 