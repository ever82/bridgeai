export default {
  getPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
  })),
  requestPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
  })),
  scheduleNotificationAsync: jest.fn(async () => 'notification-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'mock-push-token' })),
  setNotificationChannelAsync: jest.fn(async () => {}),
  AndroidImportance: {
    DEFAULT: 5,
    HIGH: 6,
    LOW: 4,
    MAX: 7,
    MIN: 1,
    NONE: 0,
    UNSPECIFIED: -1,
  },
};
