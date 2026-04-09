export const GestureHandlerRootView = jest.fn(({ children }) => children);
export const PanGestureHandler = jest.fn(({ children }) => children);
export const TapGestureHandler = jest.fn(({ children }) => children);
export const LongPressGestureHandler = jest.fn(({ children }) => children);
export const PinchGestureHandler = jest.fn(({ children }) => children);
export const RotationGestureHandler = jest.fn(({ children }) => children);
export const FlingGestureHandler = jest.fn(({ children }) => children);
export const ForceTouchGestureHandler = jest.fn(({ children }) => children);
export const NativeViewGestureHandler = jest.fn(({ children }) => children);

export const State = {
  BEGAN: 2,
  FAILED: 1,
  CANCELLED: 3,
  ACTIVE: 4,
  END: 5,
  UNDETERMINED: 0,
};

export const Directions = {
  RIGHT: 1,
  LEFT: 2,
  UP: 4,
  DOWN: 8,
};

export default {
  GestureHandlerRootView,
  PanGestureHandler,
  TapGestureHandler,
  LongPressGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  FlingGestureHandler,
  ForceTouchGestureHandler,
  NativeViewGestureHandler,
  State,
  Directions,
};
