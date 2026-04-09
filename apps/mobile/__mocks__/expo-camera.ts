export default {
  requestCameraPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
  })),
  requestMicrophonePermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
  })),
  getCameraPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
  })),
  Camera: {
    requestCameraPermissionsAsync: jest.fn(async () => ({
      status: 'granted',
      granted: true,
    })),
    requestMicrophonePermissionsAsync: jest.fn(async () => ({
      status: 'granted',
      granted: true,
    })),
  },
};
