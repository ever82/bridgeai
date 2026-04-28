"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonActions = exports.useNavigationContainerRef = exports.createNavigationContainerRef = exports.useIsFocused = exports.useFocusEffect = exports.useRoute = exports.useNavigation = exports.NavigationContainer = void 0;
// React Navigation mock
exports.NavigationContainer = jest.fn(({ children }) => children);
exports.useNavigation = jest.fn(() => ({
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
exports.useRoute = jest.fn(() => ({
    key: 'test-route',
    name: 'TestRoute',
    params: {},
    path: undefined,
}));
exports.useFocusEffect = jest.fn((callback) => callback());
exports.useIsFocused = jest.fn(() => true);
exports.createNavigationContainerRef = jest.fn(() => ({
    current: {
        navigate: jest.fn(),
        goBack: jest.fn(),
        reset: jest.fn(),
        isReady: jest.fn(() => true),
    },
}));
exports.useNavigationContainerRef = jest.fn(() => ({
    current: {
        navigate: jest.fn(),
        goBack: jest.fn(),
        reset: jest.fn(),
        isReady: jest.fn(() => true),
    },
}));
exports.CommonActions = {
    navigate: jest.fn((name, params) => ({ type: 'NAVIGATE', payload: { name, params } })),
    goBack: jest.fn(() => ({ type: 'GO_BACK' })),
    reset: jest.fn((state) => ({ type: 'RESET', payload: state })),
    setParams: jest.fn((params) => ({ type: 'SET_PARAMS', payload: params })),
};
//# sourceMappingURL=native.js.map