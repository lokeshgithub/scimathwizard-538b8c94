import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.dc35a4fed46e4381bdc3f1d935d2859b',
  appName: 'SciMath Wizard',
  webDir: 'dist',
  server: {
    url: 'https://dc35a4fe-d46e-4381-bdc3-f1d935d2859b.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'SciMath Wizard',
  },
  android: {
    backgroundColor: '#7c3aed',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#7c3aed',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#7c3aed',
    },
  },
};

export default config;
