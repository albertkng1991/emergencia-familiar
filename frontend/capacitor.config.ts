import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: "com.onda.audio",
  appName: "onda.",
  webDir: "dist",
  ios: {
    backgroundColor: "#ffffff",
    contentInset: "automatic",
    scrollEnabled: false,
  },
  // Dev: load from Vite dev server (comment out for production builds)
  server: {
    url: "http://192.168.1.130:5173",
    cleartext: true,
  },
};

export default config;
