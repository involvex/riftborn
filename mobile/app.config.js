/** @type {import('expo/config').ExpoConfig} */
const bundled = process.env.EXPO_PUBLIC_GAME_BUNDLE === '1';
const gameUrl = process.env.EXPO_PUBLIC_GAME_URL?.trim() || '';

export default {
  name: 'Riftborn',
  slug: 'riftborn',
  version: '0.2.0',
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'cover',
    backgroundColor: '#0a0c10',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'dev.riftborn.mobile',
    requireFullScreen: true,
    infoPlist: {
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
      },
    },
  },
  android: {
    package: 'dev.riftborn.mobile',
    usesCleartextTraffic: true,
    adaptiveIcon: {
      backgroundColor: '#0e1218',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-screen-orientation',
    'expo-status-bar',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0a0c10',
        image: './assets/splash.png',
        resizeMode: 'cover',
        imageWidth: 300,
      },
    ],
  ],
  extra: {
    gameUrl,
    gameBundle: bundled,
  },
};
