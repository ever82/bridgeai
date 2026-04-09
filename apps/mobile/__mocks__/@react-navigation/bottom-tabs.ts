export const createBottomTabNavigator = jest.fn(() => ({
  Navigator: jest.fn(({ children }) => children),
  Screen: jest.fn(({ children }) => children),
}));

export const BottomTabView = jest.fn(() => null);
