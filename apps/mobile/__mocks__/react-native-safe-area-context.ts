// React Native Safe Area Context mock
export const SafeAreaProvider = jest.fn(({ children }) => children);
export const SafeAreaView = jest.fn(({ children }) => children);
export const SafeAreaInsetsContext = {
  Consumer: jest.fn(({ children }) => children({ top: 0, right: 0, bottom: 0, left: 0 })),
  Provider: jest.fn(({ children }) => children),
};
export const SafeAreaFrameContext = {
  Consumer: jest.fn(({ children }) => children({ x: 0, y: 0, width: 390, height: 844 })),
  Provider: jest.fn(({ children }) => children),
};
export const useSafeAreaInsets = jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 }));
export const useSafeAreaFrame = jest.fn(() => ({ x: 0, y: 0, width: 390, height: 844 }));
export const initialWindowMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
export const initialWindowMetricsAsync = jest.fn(async () => initialWindowMetrics);
