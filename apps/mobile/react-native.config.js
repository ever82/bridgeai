module.exports = {
  dependencies: {
    '@sentry/react-native': {
      platforms: {
        ios: null, // disable iOS native module, Sentry 8.21 incompatible with Xcode 26.4 SDK
      },
    },
  },
};
