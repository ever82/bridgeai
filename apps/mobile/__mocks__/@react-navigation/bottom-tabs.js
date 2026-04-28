"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BottomTabView = exports.createBottomTabNavigator = void 0;
exports.createBottomTabNavigator = jest.fn(() => ({
    Navigator: jest.fn(({ children }) => children),
    Screen: jest.fn(({ children }) => children),
}));
exports.BottomTabView = jest.fn(() => null);
//# sourceMappingURL=bottom-tabs.js.map