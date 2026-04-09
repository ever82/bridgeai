export default {
  requestPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
  })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
  })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [
      {
        uri: 'mock-image-uri',
        width: 100,
        height: 100,
      },
    ],
  })),
  launchCameraAsync: jest.fn(async () => ({
    canceled: false,
    assets: [
      {
        uri: 'mock-camera-uri',
        width: 100,
        height: 100,
      },
    ],
  })),
  MediaTypeOptions: {
    All: 'All',
    Images: 'Images',
    Videos: 'Videos',
  },
};
