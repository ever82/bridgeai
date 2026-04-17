export default {
  name: 'BridgeAI',
  slug: 'bridgeai-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.bridgeai.mobile',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.bridgeai.mobile',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api',
    environment: process.env.NODE_ENV || 'development',
  },
  plugins: [
    [
      'expo-camera',
      {
        cameraPermission:
          'Allow BridgeAI to access your camera to capture and share moments.',
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Allow BridgeAI to access your location to tag your moments.',
      },
    ],
    [
      'expo-notifications',
      {
        sounds: ['./assets/notification.wav'],
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Allow BridgeAI to access your photos to share moments.',
      },
    ],
  ],
};
