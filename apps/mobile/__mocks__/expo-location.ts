export default {
  requestPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
  })),
  getPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
  })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: {
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 0,
      accuracy: 5,
      altitudeAccuracy: 5,
      heading: 0,
      speed: 0,
    },
    timestamp: Date.now(),
  })),
  watchPositionAsync: jest.fn(async () => ({
    remove: jest.fn(),
  })),
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
};
