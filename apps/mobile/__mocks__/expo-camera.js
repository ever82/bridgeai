"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
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
//# sourceMappingURL=expo-camera.js.map