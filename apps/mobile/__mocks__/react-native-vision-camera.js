"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFrameProcessor = exports.useCameraDevices = exports.Camera = exports.VisionCameraProxy = void 0;
exports.VisionCameraProxy = {
    getFrameProcessorPlugin: jest.fn(() => ({
        call: jest.fn(),
    })),
};
exports.Camera = {
    getCameraPermissionStatus: jest.fn().mockResolvedValue('granted'),
    requestCameraPermission: jest.fn().mockResolvedValue('granted'),
    getMicrophonePermissionStatus: jest.fn().mockResolvedValue('granted'),
    requestMicrophonePermission: jest.fn().mockResolvedValue('granted'),
    takePhoto: jest.fn().mockResolvedValue({ path: '/tmp/photo.jpg' }),
    startRecording: jest.fn(),
    stopRecording: jest.fn().mockResolvedValue({ path: '/tmp/video.mp4' }),
};
exports.useCameraDevices = jest.fn(() => ({
    back: { id: 'back', position: 'back' },
    front: { id: 'front', position: 'front' },
}));
exports.useFrameProcessor = jest.fn(callback => callback);
exports.default = {
    VisionCameraProxy: exports.VisionCameraProxy,
    Camera: exports.Camera,
    useCameraDevices: exports.useCameraDevices,
    useFrameProcessor: exports.useFrameProcessor,
};
//# sourceMappingURL=react-native-vision-camera.js.map