export const VisionCameraProxy = {
  getFrameProcessorPlugin: jest.fn(() => ({
    call: jest.fn(),
  })),
};

export const Camera = {
  getCameraPermissionStatus: jest.fn().mockResolvedValue('granted'),
  requestCameraPermission: jest.fn().mockResolvedValue('granted'),
  getMicrophonePermissionStatus: jest.fn().mockResolvedValue('granted'),
  requestMicrophonePermission: jest.fn().mockResolvedValue('granted'),
  takePhoto: jest.fn().mockResolvedValue({ path: '/tmp/photo.jpg' }),
  startRecording: jest.fn(),
  stopRecording: jest.fn().mockResolvedValue({ path: '/tmp/video.mp4' }),
};

export const useCameraDevices = jest.fn(() => ({
  back: { id: 'back', position: 'back' },
  front: { id: 'front', position: 'front' },
}));

export const useFrameProcessor = jest.fn(callback => callback);

export default {
  VisionCameraProxy,
  Camera,
  useCameraDevices,
  useFrameProcessor,
};
