export const createNativeStackNavigator = jest.fn(() => ({
  Navigator: jest.fn(({ children }) => children),
  Screen: jest.fn(({ children }) => children),
}));

export const NativeStackView = jest.fn(() => null);
