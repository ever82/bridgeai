"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeStackView = exports.createNativeStackNavigator = void 0;
exports.createNativeStackNavigator = jest.fn(() => ({
    Navigator: jest.fn(({ children }) => children),
    Screen: jest.fn(({ children }) => children),
}));
exports.NativeStackView = jest.fn(() => null);
//# sourceMappingURL=native-stack.js.map