"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manipulateAsync = exports.SaveFormat = void 0;
exports.SaveFormat = {
    JPEG: 'jpeg',
    PNG: 'png',
    WEBP: 'webp',
};
exports.manipulateAsync = jest.fn(async () => ({
    uri: 'file:///mock/manipulated.jpg',
    width: 224,
    height: 224,
}));
exports.default = {
    manipulateAsync: exports.manipulateAsync,
    SaveFormat: exports.SaveFormat,
};
//# sourceMappingURL=expo-image-manipulator.js.map