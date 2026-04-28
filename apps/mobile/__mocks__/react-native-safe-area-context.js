"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialWindowMetricsAsync = exports.initialWindowMetrics = exports.useSafeAreaFrame = exports.useSafeAreaInsets = exports.SafeAreaFrameContext = exports.SafeAreaInsetsContext = exports.SafeAreaView = exports.SafeAreaProvider = void 0;
// React Native Safe Area Context mock
exports.SafeAreaProvider = jest.fn(({ children }) => children);
exports.SafeAreaView = jest.fn(({ children }) => children);
exports.SafeAreaInsetsContext = {
    Consumer: jest.fn(({ children }) => children({ top: 0, right: 0, bottom: 0, left: 0 })),
    Provider: jest.fn(({ children }) => children),
};
exports.SafeAreaFrameContext = {
    Consumer: jest.fn(({ children }) => children({ x: 0, y: 0, width: 390, height: 844 })),
    Provider: jest.fn(({ children }) => children),
};
exports.useSafeAreaInsets = jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 }));
exports.useSafeAreaFrame = jest.fn(() => ({ x: 0, y: 0, width: 390, height: 844 }));
exports.initialWindowMetrics = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
exports.initialWindowMetricsAsync = jest.fn(async () => exports.initialWindowMetrics);
//# sourceMappingURL=react-native-safe-area-context.js.map