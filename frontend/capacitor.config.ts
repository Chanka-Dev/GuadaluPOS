import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'bo.com.guadalupos',
  appName: 'GuadaluPOS',
  webDir: 'dist/frontend/browser',
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
