"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Directions = exports.State = exports.NativeViewGestureHandler = exports.ForceTouchGestureHandler = exports.FlingGestureHandler = exports.RotationGestureHandler = exports.PinchGestureHandler = exports.LongPressGestureHandler = exports.TapGestureHandler = exports.PanGestureHandler = exports.GestureHandlerRootView = void 0;
exports.GestureHandlerRootView = jest.fn(({ children }) => children);
exports.PanGestureHandler = jest.fn(({ children }) => children);
exports.TapGestureHandler = jest.fn(({ children }) => children);
exports.LongPressGestureHandler = jest.fn(({ children }) => children);
exports.PinchGestureHandler = jest.fn(({ children }) => children);
exports.RotationGestureHandler = jest.fn(({ children }) => children);
exports.FlingGestureHandler = jest.fn(({ children }) => children);
exports.ForceTouchGestureHandler = jest.fn(({ children }) => children);
exports.NativeViewGestureHandler = jest.fn(({ children }) => children);
exports.State = {
    BEGAN: 2,
    FAILED: 1,
    CANCELLED: 3,
    ACTIVE: 4,
    END: 5,
    UNDETERMINED: 0,
};
exports.Directions = {
    RIGHT: 1,
    LEFT: 2,
    UP: 4,
    DOWN: 8,
};
exports.default = {
    GestureHandlerRootView: exports.GestureHandlerRootView,
    PanGestureHandler: exports.PanGestureHandler,
    TapGestureHandler: exports.TapGestureHandler,
    LongPressGestureHandler: exports.LongPressGestureHandler,
    PinchGestureHandler: exports.PinchGestureHandler,
    RotationGestureHandler: exports.RotationGestureHandler,
    FlingGestureHandler: exports.FlingGestureHandler,
    ForceTouchGestureHandler: exports.ForceTouchGestureHandler,
    NativeViewGestureHandler: exports.NativeViewGestureHandler,
    State: exports.State,
    Directions: exports.Directions,
};
//# sourceMappingURL=react-native-gesture-handler.js.map