declare module 'next-pwa' {
  import { NextConfig } from 'next';
  
  interface RuntimeCacheRule {
    urlPattern: RegExp | string;
    handler: string;
    options?: {
      cacheName?: string;
      expiration?: {
        maxEntries?: number;
        maxAgeSeconds?: number;
      };
      cacheableResponse?: {
        statuses?: number[];
        headers?: {
          [key: string]: string;
        };
      };
      networkTimeoutSeconds?: number;
      backgroundSync?: {
        name: string;
        options?: {
          maxRetentionTime?: number;
        };
      };
    };
  }
  
  type PWAConfig = {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    runtimeCaching?: RuntimeCacheRule[];
    buildExcludes?: Array<string | RegExp>;
    scope?: string;
    sw?: string;
  };
  
  export default function withPWA(pwaConfig?: PWAConfig): 
    (nextConfig?: NextConfig) => NextConfig;
} 