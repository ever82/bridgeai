"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWindowDimensions = exports.useColorScheme = exports.processColor = exports.findNodeHandle = exports.YellowBox = exports.Vibration = exports.UIManager = exports.Share = exports.Settings = exports.PermissionsAndroid = exports.PanResponder = exports.NativeModules = exports.NativeEventEmitter = exports.LogBox = exports.Linking = exports.Keyboard = exports.InteractionManager = exports.I18nManager = exports.Easing = exports.DeviceEventEmitter = exports.Clipboard = exports.BackHandler = exports.AsyncStorage = exports.AppState = exports.AppRegistry = exports.Alert = exports.AccessibilityInfo = exports.Animated = exports.PixelRatio = exports.Dimensions = exports.Platform = exports.StyleSheet = exports.KeyboardAvoidingView = exports.StatusBar = exports.SafeAreaView = exports.Modal = exports.Switch = exports.ActivityIndicator = exports.Button = exports.TextInput = exports.Pressable = exports.TouchableWithoutFeedback = exports.TouchableHighlight = exports.TouchableOpacity = exports.SectionList = exports.FlatList = exports.ScrollView = exports.Image = exports.Text = exports.View = void 0;
exports.LayoutAnimation = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// React Native Mock for Jest testing
const react_1 = __importDefault(require("react"));
const mockComponent = (name) => {
    return jest.fn((props) => {
        const { children, ...rest } = props;
        return react_1.default.createElement(name, rest, children);
    });
};
// View
exports.View = mockComponent('View');
exports.Text = mockComponent('Text');
exports.Image = mockComponent('Image');
exports.ScrollView = mockComponent('ScrollView');
exports.FlatList = jest.fn((props) => {
    const { data, renderItem, keyExtractor, testID, children, ListHeaderComponent, ListEmptyComponent, ListFooterComponent, contentContainerStyle, ...rest } = props;
    // Props that tests access via flatList.props
    const renderedProps = { ListFooterComponent, contentContainerStyle };
    const renderHeaderOrEmpty = (Component) => {
        if (!Component)
            return null;
        if (typeof Component === 'function') {
            return react_1.default.createElement(Component);
        }
        return Component;
    };
    // If children are passed directly, render them (for non-standard usage)
    if (children) {
        return react_1.default.createElement('FlatList', { testID, ...renderedProps, ...rest }, children);
    }
    // Otherwise, render items from data using renderItem
    if (data && renderItem) {
        const header = renderHeaderOrEmpty(ListHeaderComponent);
        const empty = data.length === 0 ? renderHeaderOrEmpty(ListEmptyComponent) : null;
        const footer = renderHeaderOrEmpty(ListFooterComponent);
        const items = data.map((item, index) => {
            const key = keyExtractor ? keyExtractor(item, index) : index;
            return react_1.default.createElement(exports.View, { key, testID: `flat-list-item-${key}` }, renderItem({ item, index }));
        });
        return react_1.default.createElement(exports.FlatList, { testID, ...renderedProps, ...rest }, header, ...items, empty, footer);
    }
    return react_1.default.createElement('FlatList', { testID, ...renderedProps, ...rest });
});
exports.SectionList = mockComponent('SectionList');
exports.TouchableOpacity = jest.fn((props) => {
    const { children, onPress, disabled, testID, style } = props;
    return react_1.default.createElement(exports.View, { testID, accessibilityState: { disabled: !!disabled }, onPress, style }, children);
});
exports.TouchableHighlight = mockComponent('TouchableHighlight');
exports.TouchableWithoutFeedback = mockComponent('TouchableWithoutFeedback');
exports.Pressable = mockComponent('Pressable');
exports.TextInput = mockComponent('TextInput');
exports.Button = mockComponent('Button');
exports.ActivityIndicator = mockComponent('ActivityIndicator');
exports.Switch = mockComponent('Switch');
exports.Modal = mockComponent('Modal');
exports.SafeAreaView = mockComponent('SafeAreaView');
exports.StatusBar = mockComponent('StatusBar');
exports.KeyboardAvoidingView = mockComponent('KeyboardAvoidingView');
// APIs
exports.StyleSheet = {
    create: (styles) => styles,
    flatten: (styles) => styles,
};
exports.Platform = {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
    Version: '16.0',
};
exports.Dimensions = {
    get: jest.fn(() => ({
        width: 390,
        height: 844,
        scale: 2,
        fontScale: 1,
    })),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
};
exports.PixelRatio = {
    get: jest.fn(() => 2),
    getFontScale: jest.fn(() => 1),
    getPixelSizeForLayoutSize: jest.fn((size) => size * 2),
    roundToNearestPixel: jest.fn((size) => Math.round(size)),
};
exports.Animated = {
    View: mockComponent('Animated.View'),
    Text: mockComponent('Animated.Text'),
    Image: mockComponent('Animated.Image'),
    ScrollView: mockComponent('Animated.ScrollView'),
    FlatList: mockComponent('Animated.FlatList'),
    Value: jest.fn((value) => ({
        setValue: jest.fn(),
        setOffset: jest.fn(),
        flattenOffset: jest.fn(),
        addListener: jest.fn(() => ({ remove: jest.fn() })),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        stopAnimation: jest.fn(),
        resetAnimation: jest.fn(),
        interpolate: jest.fn(() => ({})),
        animate: jest.fn(),
        value,
    })),
    ValueXY: jest.fn(() => ({
        x: new exports.Animated.Value(0),
        y: new exports.Animated.Value(0),
        setValue: jest.fn(),
        setOffset: jest.fn(),
        flattenOffset: jest.fn(),
        stopAnimation: jest.fn(),
        addListener: jest.fn(() => ({ remove: jest.fn() })),
        removeListener: jest.fn(),
        getLayout: jest.fn(() => ({})),
        getTranslateTransform: jest.fn(() => []),
    })),
    timing: jest.fn(() => ({
        start: jest.fn((callback) => {
            if (callback)
                callback({ finished: true });
        }),
        stop: jest.fn(),
        reset: jest.fn(),
    })),
    spring: jest.fn(() => ({
        start: jest.fn((callback) => {
            if (callback)
                callback({ finished: true });
        }),
        stop: jest.fn(),
        reset: jest.fn(),
    })),
    decay: jest.fn(() => ({
        start: jest.fn((callback) => {
            if (callback)
                callback({ finished: true });
        }),
        stop: jest.fn(),
        reset: jest.fn(),
    })),
    sequence: jest.fn(() => ({
        start: jest.fn((callback) => {
            if (callback)
                callback({ finished: true });
        }),
        stop: jest.fn(),
        reset: jest.fn(),
    })),
    parallel: jest.fn(() => ({
        start: jest.fn((callback) => {
            if (callback)
                callback({ finished: true });
        }),
        stop: jest.fn(),
        reset: jest.fn(),
    })),
    stagger: jest.fn(() => ({
        start: jest.fn((callback) => {
            if (callback)
                callback({ finished: true });
        }),
        stop: jest.fn(),
        reset: jest.fn(),
    })),
    loop: jest.fn(() => ({
        start: jest.fn((callback) => {
            if (callback)
                callback({ finished: true });
        }),
        stop: jest.fn(),
        reset: jest.fn(),
    })),
    createAnimatedComponent: jest.fn((component) => component),
    event: jest.fn(),
    add: jest.fn((a, b) => ({
        __getValue: () => (a.__getValue?.() || a) + (b.__getValue?.() || b),
    })),
    subtract: jest.fn((a, b) => ({
        __getValue: () => (a.__getValue?.() || a) - (b.__getValue?.() || b),
    })),
    multiply: jest.fn((a, b) => ({
        __getValue: () => (a.__getValue?.() || a) * (b.__getValue?.() || b),
    })),
    divide: jest.fn((a, b) => ({
        __getValue: () => (a.__getValue?.() || a) / (b.__getValue?.() || b),
    })),
    modulo: jest.fn((a, b) => ({
        __getValue: () => (a.__getValue?.() || a) % (b.__getValue?.() || b),
    })),
    diffClamp: jest.fn((a, min, max) => ({
        __getValue: () => Math.max(min, Math.min(max, a.__getValue?.() || a)),
    })),
};
exports.AccessibilityInfo = {
    isScreenReaderEnabled: jest.fn(async () => false),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    setAccessibilityFocus: jest.fn(),
    announceForAccessibility: jest.fn(),
};
exports.Alert = {
    alert: jest.fn(),
    prompt: jest.fn(),
};
exports.AppRegistry = {
    registerComponent: jest.fn(),
    registerRunnable: jest.fn(),
    registerSection: jest.fn(),
    getApplication: jest.fn(),
    runApplication: jest.fn(),
};
exports.AppState = {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    currentState: 'active',
};
exports.AsyncStorage = {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => { }),
    removeItem: jest.fn(async () => { }),
    mergeItem: jest.fn(async () => { }),
    clear: jest.fn(async () => { }),
    getAllKeys: jest.fn(async () => []),
    flushGetRequests: jest.fn(),
    multiGet: jest.fn(async () => []),
    multiSet: jest.fn(async () => { }),
    multiRemove: jest.fn(async () => { }),
    multiMerge: jest.fn(async () => { }),
};
exports.BackHandler = {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    exitApp: jest.fn(),
};
exports.Clipboard = {
    getString: jest.fn(async () => ''),
    setString: jest.fn(),
};
exports.DeviceEventEmitter = {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    emit: jest.fn(),
};
exports.Easing = {
    linear: jest.fn((t) => t),
    ease: jest.fn((t) => t),
    quad: jest.fn((t) => t * t),
    cubic: jest.fn((t) => t * t * t),
    poly: jest.fn((n) => (t) => Math.pow(t, n)),
    sin: jest.fn((t) => Math.sin((t * Math.PI) / 2)),
    circle: jest.fn((t) => 1 - Math.sqrt(1 - t * t)),
    exp: jest.fn((t) => Math.pow(2, 10 * (t - 1))),
    elastic: jest.fn((bounciness) => (t) => t),
    back: jest.fn((s) => (t) => t),
    bounce: jest.fn((t) => t),
    bezier: jest.fn((x1, y1, x2, y2) => (t) => t),
    in: jest.fn((easing) => (t) => easing(t)),
    out: jest.fn((easing) => (t) => 1 - easing(1 - t)),
    inOut: jest.fn((easing) => (t) => {
        if (t < 0.5)
            return easing(t * 2) / 2;
        return 1 - easing((1 - t) * 2) / 2;
    }),
};
exports.I18nManager = {
    isRTL: false,
    allowRTL: jest.fn(),
    forceRTL: jest.fn(),
    swapLeftAndRightInRTL: jest.fn(),
    doLeftAndRightSwapInRTL: false,
};
exports.InteractionManager = {
    runAfterInteractions: jest.fn((task) => {
        if (task)
            task();
        return { then: jest.fn(), done: jest.fn(), cancel: jest.fn() };
    }),
    createInteractionHandle: jest.fn(() => 1),
    clearInteractionHandle: jest.fn(),
    setDeadline: jest.fn(),
};
exports.Keyboard = {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    dismiss: jest.fn(),
    scheduleLayoutAnimation: jest.fn(),
};
exports.Linking = {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    openURL: jest.fn(async () => true),
    canOpenURL: jest.fn(async () => true),
    getInitialURL: jest.fn(async () => null),
};
exports.LogBox = {
    ignoreLogs: jest.fn(),
    ignoreAllLogs: jest.fn(),
    uninstall: jest.fn(),
    install: jest.fn(),
};
exports.NativeEventEmitter = jest.fn(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    emit: jest.fn(),
}));
exports.NativeModules = {};
exports.PanResponder = {
    create: jest.fn((config) => ({
        panHandlers: {},
    })),
};
exports.PermissionsAndroid = {
    request: jest.fn(async () => 'granted'),
    requestMultiple: jest.fn(async () => ({})),
    check: jest.fn(async () => true),
    PERMISSIONS: {},
    RESULTS: {
        GRANTED: 'granted',
        DENIED: 'denied',
        NEVER_ASK_AGAIN: 'never_ask_again',
    },
};
exports.Settings = {
    get: jest.fn(() => ''),
    set: jest.fn(),
    watchKeys: jest.fn(() => 0),
    clearWatch: jest.fn(),
};
exports.Share = {
    share: jest.fn(async () => ({ action: 'sharedActivity' })),
    sharedAction: 'sharedAction',
    dismissedAction: 'dismissedAction',
};
exports.UIManager = {
    measure: jest.fn((ref, callback) => {
        callback(0, 0, 100, 100, 0, 0);
    }),
    measureInWindow: jest.fn((ref, callback) => {
        callback(0, 0, 100, 100);
    }),
    measureLayout: jest.fn((ref, relativeTo, onFail, onSuccess) => {
        onSuccess(0, 0, 100, 100);
    }),
    setLayoutAnimationEnabledExperimental: jest.fn(),
    configureNextLayoutAnimation: jest.fn(),
};
exports.Vibration = {
    vibrate: jest.fn(),
    cancel: jest.fn(),
    VIBRATION_TYPE_IMPACT_LIGHT: 'VIBRATION_TYPE_IMPACT_LIGHT',
    VIBRATION_TYPE_IMPACT_MEDIUM: 'VIBRATION_TYPE_IMPACT_MEDIUM',
    VIBRATION_TYPE_IMPACT_HEAVY: 'VIBRATION_TYPE_IMPACT_HEAVY',
    VIBRATION_TYPE_NOTIFICATION_SUCCESS: 'VIBRATION_TYPE_NOTIFICATION_SUCCESS',
    VIBRATION_TYPE_NOTIFICATION_WARNING: 'VIBRATION_TYPE_NOTIFICATION_WARNING',
    VIBRATION_TYPE_NOTIFICATION_ERROR: 'VIBRATION_TYPE_NOTIFICATION_ERROR',
};
exports.YellowBox = {
    ignoreWarnings: jest.fn(),
};
exports.findNodeHandle = jest.fn(() => 1);
exports.processColor = jest.fn((color) => color);
exports.useColorScheme = jest.fn(() => 'light');
exports.useWindowDimensions = jest.fn(() => ({
    width: 390,
    height: 844,
    scale: 2,
    fontScale: 1,
}));
// LayoutAnimation
exports.LayoutAnimation = {
    configureNext: jest.fn(),
    create: jest.fn(() => ({})),
    checkConfig: jest.fn(),
    Presets: {
        easeInEaseOut: 'easeInEaseOut',
        linear: 'linear',
        spring: 'spring',
    },
    Types: {
        spring: 'spring',
        linear: 'linear',
        easeInEaseOut: 'easeInEaseOut',
        easeIn: 'easeIn',
        easeOut: 'easeOut',
        keyboard: 'keyboard',
    },
    Properties: {
        opacity: 'opacity',
        scaleXY: 'scaleXY',
    },
};
// Default export
exports.default = {
    View: exports.View,
    Text: exports.Text,
    Image: exports.Image,
    ScrollView: exports.ScrollView,
    FlatList: exports.FlatList,
    SectionList: exports.SectionList,
    TouchableOpacity: exports.TouchableOpacity,
    TouchableHighlight: exports.TouchableHighlight,
    TouchableWithoutFeedback: exports.TouchableWithoutFeedback,
    Pressable: exports.Pressable,
    TextInput: exports.TextInput,
    Button: exports.Button,
    ActivityIndicator: exports.ActivityIndicator,
    Switch: exports.Switch,
    Modal: exports.Modal,
    SafeAreaView: exports.SafeAreaView,
    StatusBar: exports.StatusBar,
    KeyboardAvoidingView: exports.KeyboardAvoidingView,
    StyleSheet: exports.StyleSheet,
    Platform: exports.Platform,
    Dimensions: exports.Dimensions,
    PixelRatio: exports.PixelRatio,
    Animated: exports.Animated,
    AccessibilityInfo: exports.AccessibilityInfo,
    Alert: exports.Alert,
    AppRegistry: exports.AppRegistry,
    AppState: exports.AppState,
    AsyncStorage: exports.AsyncStorage,
    BackHandler: exports.BackHandler,
    Clipboard: exports.Clipboard,
    DeviceEventEmitter: exports.DeviceEventEmitter,
    Easing: exports.Easing,
    I18nManager: exports.I18nManager,
    InteractionManager: exports.InteractionManager,
    Keyboard: exports.Keyboard,
    Linking: exports.Linking,
    LogBox: exports.LogBox,
    NativeEventEmitter: exports.NativeEventEmitter,
    NativeModules: exports.NativeModules,
    PanResponder: exports.PanResponder,
    PermissionsAndroid: exports.PermissionsAndroid,
    Settings: exports.Settings,
    Share: exports.Share,
    UIManager: exports.UIManager,
    Vibration: exports.Vibration,
    YellowBox: exports.YellowBox,
    findNodeHandle: exports.findNodeHandle,
    processColor: exports.processColor,
    useColorScheme: exports.useColorScheme,
    useWindowDimensions: exports.useWindowDimensions,
    LayoutAnimation: exports.LayoutAnimation,
};
//# sourceMappingURL=react-native.js.map