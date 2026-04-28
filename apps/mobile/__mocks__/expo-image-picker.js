"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
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
//# sourceMappingURL=expo-image-picker.js.map