"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GestureDetectorView = exports.FullWindowOverlay = exports.SearchBar = exports.ScreenStackHeaderSubview = exports.ScreenStackHeaderConfig = exports.ScreenStack = exports.Screen = exports.ScreenContainer = exports.NativeScreenContainer = exports.NativeScreen = exports.screensEnabled = exports.enableScreens = void 0;
exports.default = jest.fn(({ children }) => children);
exports.enableScreens = jest.fn();
exports.screensEnabled = jest.fn(() => false);
exports.NativeScreen = jest.fn(({ children }) => children);
exports.NativeScreenContainer = jest.fn(({ children }) => children);
exports.ScreenContainer = jest.fn(({ children }) => children);
exports.Screen = jest.fn(({ children }) => children);
exports.ScreenStack = jest.fn(({ children }) => children);
exports.ScreenStackHeaderConfig = jest.fn(() => null);
exports.ScreenStackHeaderSubview = jest.fn(() => null);
exports.SearchBar = jest.fn(() => null);
exports.FullWindowOverlay = jest.fn(({ children }) => children);
exports.GestureDetectorView = jest.fn(({ children }) => children);
//# sourceMappingURL=react-native-screens.js.map