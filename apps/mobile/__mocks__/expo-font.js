"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unloadAsync = exports.isLoaded = exports.loadAsync = void 0;
exports.loadAsync = jest.fn(async () => { });
exports.isLoaded = jest.fn(() => true);
exports.unloadAsync = jest.fn(async () => { });
exports.default = {
    loadAsync: exports.loadAsync,
    isLoaded: exports.isLoaded,
    unloadAsync: exports.unloadAsync,
};
//# sourceMappingURL=expo-font.js.map