// React Navigation mock
export const NavigationContainer = jest.fn(({ children }) => children);

export const useNavigation = jest.fn(() => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
  setOptions: jest.fn(),
  getState: jest.fn(() => ({})),
  getParent: jest.fn(() => null),
  getId: jest.fn(() => undefined),
}));

export const useRoute = jest.fn(() => ({
  key: 'test-route',
  name: 'TestRoute',
  params: {},
  path: undefined,
}));

export const useFocusEffect = jest.fn((callback) => callback());

export const useIsFocused = jest.fn(() => true);

export const createNavigationContainerRef = jest.fn(() => ({
  current: {
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    isReady: jest.fn(() => true),
  },
}));

export const useNavigationContainerRef = jest.fn(() => ({
  current: {
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    isReady: jest.fn(() => true),
  },
}));

export const CommonActions = {
  navigate: jest.fn((name, params) => ({ type: 'NAVIGATE', payload: { name, params } })),
  goBack: jest.fn(() => ({ type: 'GO_BACK' })),
  reset: jest.fn((state) => ({ type: 'RESET', payload: state })),
  setParams: jest.fn((params) => ({ type: 'SET_PARAMS', payload: params })),
};
