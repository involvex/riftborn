/** @type {import('expo/config').ExpoConfig} */
const bundled = process.env.EXPO_PUBLIC_GAME_BUNDLE === '1';
const gameUrl = process.env.EXPO_PUBLIC_GAME_URL?.trim() || '';

export default {
  name: 'Riftborn',
  slug: 'riftborn',
  version: '0.1.0',
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0e1218',
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
  plugins: ['expo-screen-orientation'],
  extra: {
    gameUrl,
    gameBundle: bundled,
  },
};
