import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mycarqr.app',
  appName: 'MyCarQR',
  webDir: 'dist/public',
  server: {
    url: 'https://mycarqr.online',
    cleartext: false
  }
};

export default config;