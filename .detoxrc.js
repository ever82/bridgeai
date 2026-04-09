/** @type {Detox.DetoxConfig} */
module.exports = {
  logger: {
    level: process.env.CI ? 'debug' : 'info',
  },
  testRunner: {
    $0: 'jest',
    args: {
      config: 'e2e/jest.config.js',
      '--testEnvironment': 'node',
      '--setupFilesAfterEnv': ['./e2e/setup.ts'],
    },
  },
  artifacts: {
    rootDir: 'artifacts',
    plugins: {
      screenshot: {
        enabled: true,
        shouldTakeAutomaticSnapshots: true,
        keepOnlyFailedTestsArtifacts: true,
        takeWhen: {
          testStart: false,
          testDone: true,
        },
      },
      video: {
        enabled: true,
        keepOnlyFailedTestsArtifacts: true,
      },
      instruments: {
        enabled: false,
      },
      log: {
        enabled: true,
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'ios.simulator',
      app: 'ios.debug',
    },
    'ios.sim.release': {
      device: 'ios.simulator',
      app: 'ios.release',
    },
    'android.emu.debug': {
      device: 'android.emulator',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'android.emulator',
      app: 'android.release',
    },
    'ios.sim.parallel': {
      device: {
        type: 'ios.simulator',
        device: {
          type: 'iPhone 14',
        },
        headless: process.env.CI ? true : false,
      },
      app: 'ios.debug',
      session: {
        maxWorkers: 3,
      },
    },
    'android.emu.parallel': {
      device: {
        type: 'android.emulator',
        device: {
          avdName: 'Pixel_6_API_33',
        },
        headless: process.env.CI ? true : false,
      },
      app: 'android.debug',
      session: {
        maxWorkers: 2,
      },
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/VisionShare.app',
      build: 'xcodebuild -workspace ios/VisionShare.xcworkspace -scheme VisionShare -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/VisionShare.app',
      build: 'xcodebuild -workspace ios/VisionShare.xcworkspace -scheme VisionShare -configuration Release -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14',
        os: 'iOS 16.0',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_6_API_33',
      },
    },
  },
};
