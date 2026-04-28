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
  useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
  CameraView: 'CameraView',
  CameraType: { back: 'back', front: 'front' },
  FlashMode: { on: 'on', off: 'off', auto: 'auto' },
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
