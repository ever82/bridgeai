"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESULTS = exports.PERMISSIONS = exports.request = exports.check = void 0;
exports.check = jest.fn(async () => 'granted');
exports.request = jest.fn(async () => 'granted');
exports.PERMISSIONS = {
    IOS: {
        PHOTO_LIBRARY: 'ios.permission.PHOTO_LIBRARY',
        PHOTO_LIBRARY_ADD_ONLY: 'ios.permission.PHOTO_LIBRARY_ADD_ONLY',
        CAMERA: 'ios.permission.CAMERA',
        MICROPHONE: 'ios.permission.MICROPHONE',
        LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
        LOCATION_ALWAYS: 'ios.permission.LOCATION_ALWAYS',
        MEDIA_LIBRARY: 'ios.permission.MEDIA_LIBRARY',
    },
    ANDROID: {
        READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
        READ_MEDIA_IMAGES: 'android.permission.READ_MEDIA_IMAGES',
        READ_MEDIA_VIDEO: 'android.permission.READ_MEDIA_VIDEO',
        CAMERA: 'android.permission.CAMERA',
        RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
        ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
        ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION',
    },
};
exports.RESULTS = {
    UNAVAILABLE: 'unavailable',
    DENIED: 'denied',
    LIMITED: 'limited',
    GRANTED: 'granted',
    BLOCKED: 'blocked',
};
exports.default = {
    check: exports.check,
    request: exports.request,
    PERMISSIONS: exports.PERMISSIONS,
    RESULTS: exports.RESULTS,
};
//# sourceMappingURL=react-native-permissions.js.map