import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mycarqr.app',
  appName: 'MyCarQR',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  }
};

export default config;