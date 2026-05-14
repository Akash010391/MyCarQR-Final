import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mycarqr.app",
  appName: "MyCarQR",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
    url: "https://mycarqr.online",
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#1a3a6e",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#1a3a6e",
  },
};

export default config;
