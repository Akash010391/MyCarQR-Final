import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mycarqr.app',
  appName: 'MyCarQR',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'mycarqr.online',
      '*.mycarqr.online',
      'accounts.google.com',
      '*.google.com',
      'clerk.mycarqr.online'
    ]
  }
};

export default config;