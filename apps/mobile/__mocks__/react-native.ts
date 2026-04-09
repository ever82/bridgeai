// React Native Mock for Jest testing
import React from 'react';

const mockComponent = (name: string) => {
  return jest.fn((props: any) => {
    const { children, ...rest } = props;
    return React.createElement(name, rest, children);
  });
};

// View
export const View = mockComponent('View');
export const Text = mockComponent('Text');
export const Image = mockComponent('Image');
export const ScrollView = mockComponent('ScrollView');
export const FlatList = jest.fn((props: any) => {
  const { data, renderItem, keyExtractor, testID, children, ...rest } = props;
  // If children are passed directly, render them (for non-standard usage)
  if (children) {
    return React.createElement('FlatList', { testID, ...rest }, children);
  }
  // Otherwise, render items from data using renderItem
  if (data && renderItem) {
    const items = data.map((item: any, index: number) => {
      const key = keyExtractor ? keyExtractor(item, index) : index;
      return React.createElement(View, { key, testID: `flat-list-item-${key}` }, renderItem({ item, index }));
    });
    return React.createElement(View, { testID }, items);
  }
  return React.createElement('FlatList', { testID, ...rest });
});
export const SectionList = mockComponent('SectionList');
export const TouchableOpacity = jest.fn((props: any) => {
  const { children, onPress, disabled, testID, style } = props;
  return React.createElement(View, { testID, accessibilityState: { disabled: !!disabled }, onPress, style }, children);
});
export const TouchableHighlight = mockComponent('TouchableHighlight');
export const TouchableWithoutFeedback = mockComponent('TouchableWithoutFeedback');
export const Pressable = mockComponent('Pressable');
export const TextInput = mockComponent('TextInput');
export const Button = mockComponent('Button');
export const ActivityIndicator = mockComponent('ActivityIndicator');
export const Switch = mockComponent('Switch');
export const Modal = mockComponent('Modal');
export const SafeAreaView = mockComponent('SafeAreaView');
export const StatusBar = mockComponent('StatusBar');
export const KeyboardAvoidingView = mockComponent('KeyboardAvoidingView');

// APIs
export const StyleSheet = {
  create: (styles: any) => styles,
  flatten: (styles: any) => styles,
};

export const Platform = {
  OS: 'ios',
  select: jest.fn((obj: any) => obj.ios || obj.default),
  Version: '16.0',
};

export const Dimensions = {
  get: jest.fn(() => ({
    width: 390,
    height: 844,
    scale: 2,
    fontScale: 1,
  })),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
};

export const PixelRatio = {
  get: jest.fn(() => 2),
  getFontScale: jest.fn(() => 1),
  getPixelSizeForLayoutSize: jest.fn((size: number) => size * 2),
  roundToNearestPixel: jest.fn((size: number) => Math.round(size)),
};

export const Animated = {
  View: mockComponent('Animated.View'),
  Text: mockComponent('Animated.Text'),
  Image: mockComponent('Animated.Image'),
  ScrollView: mockComponent('Animated.ScrollView'),
  FlatList: mockComponent('Animated.FlatList'),
  Value: jest.fn((value: number) => ({
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
    x: new Animated.Value(0),
    y: new Animated.Value(0),
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
    start: jest.fn((callback?: (result: { finished: boolean }) => void) => {
      if (callback) callback({ finished: true });
    }),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  spring: jest.fn(() => ({
    start: jest.fn((callback?: (result: { finished: boolean }) => void) => {
      if (callback) callback({ finished: true });
    }),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  decay: jest.fn(() => ({
    start: jest.fn((callback?: (result: { finished: boolean }) => void) => {
      if (callback) callback({ finished: true });
    }),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  sequence: jest.fn(() => ({
    start: jest.fn((callback?: (result: { finished: boolean }) => void) => {
      if (callback) callback({ finished: true });
    }),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  parallel: jest.fn(() => ({
    start: jest.fn((callback?: (result: { finished: boolean }) => void) => {
      if (callback) callback({ finished: true });
    }),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  stagger: jest.fn(() => ({
    start: jest.fn((callback?: (result: { finished: boolean }) => void) => {
      if (callback) callback({ finished: true });
    }),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  loop: jest.fn(() => ({
    start: jest.fn((callback?: (result: { finished: boolean }) => void) => {
      if (callback) callback({ finished: true });
    }),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  createAnimatedComponent: jest.fn((component: any) => component),
  event: jest.fn(),
  add: jest.fn((a: any, b: any) => ({ __getValue: () => (a.__getValue?.() || a) + (b.__getValue?.() || b) })),
  subtract: jest.fn((a: any, b: any) => ({ __getValue: () => (a.__getValue?.() || a) - (b.__getValue?.() || b) })),
  multiply: jest.fn((a: any, b: any) => ({ __getValue: () => (a.__getValue?.() || a) * (b.__getValue?.() || b) })),
  divide: jest.fn((a: any, b: any) => ({ __getValue: () => (a.__getValue?.() || a) / (b.__getValue?.() || b) })),
  modulo: jest.fn((a: any, b: any) => ({ __getValue: () => (a.__getValue?.() || a) % (b.__getValue?.() || b) })),
  diffClamp: jest.fn((a: any, min: number, max: number) => ({ __getValue: () => Math.max(min, Math.min(max, a.__getValue?.() || a)) })),
};

export const AccessibilityInfo = {
  isScreenReaderEnabled: jest.fn(async () => false),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  setAccessibilityFocus: jest.fn(),
  announceForAccessibility: jest.fn(),
};

export const Alert = {
  alert: jest.fn(),
  prompt: jest.fn(),
};

export const AppRegistry = {
  registerComponent: jest.fn(),
  registerRunnable: jest.fn(),
  registerSection: jest.fn(),
  getApplication: jest.fn(),
  runApplication: jest.fn(),
};

export const AppState = {
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  currentState: 'active',
};

export const AsyncStorage = {
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
  mergeItem: jest.fn(async () => {}),
  clear: jest.fn(async () => {}),
  getAllKeys: jest.fn(async () => []),
  flushGetRequests: jest.fn(),
  multiGet: jest.fn(async () => []),
  multiSet: jest.fn(async () => {}),
  multiRemove: jest.fn(async () => {}),
  multiMerge: jest.fn(async () => {}),
};

export const BackHandler = {
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  exitApp: jest.fn(),
};

export const Clipboard = {
  getString: jest.fn(async () => ''),
  setString: jest.fn(),
};

export const DeviceEventEmitter = {
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  emit: jest.fn(),
};

export const Easing = {
  linear: jest.fn((t: number) => t),
  ease: jest.fn((t: number) => t),
  quad: jest.fn((t: number) => t * t),
  cubic: jest.fn((t: number) => t * t * t),
  poly: jest.fn((n: number) => (t: number) => Math.pow(t, n)),
  sin: jest.fn((t: number) => Math.sin(t * Math.PI / 2)),
  circle: jest.fn((t: number) => 1 - Math.sqrt(1 - t * t)),
  exp: jest.fn((t: number) => Math.pow(2, 10 * (t - 1))),
  elastic: jest.fn((bounciness?: number) => (t: number) => t),
  back: jest.fn((s?: number) => (t: number) => t),
  bounce: jest.fn((t: number) => t),
  bezier: jest.fn((x1: number, y1: number, x2: number, y2: number) => (t: number) => t),
  in: jest.fn((easing: (t: number) => number) => (t: number) => easing(t)),
  out: jest.fn((easing: (t: number) => number) => (t: number) => 1 - easing(1 - t)),
  inOut: jest.fn((easing: (t: number) => number) => (t: number) => {
    if (t < 0.5) return easing(t * 2) / 2;
    return 1 - easing((1 - t) * 2) / 2;
  }),
};

export const I18nManager = {
  isRTL: false,
  allowRTL: jest.fn(),
  forceRTL: jest.fn(),
  swapLeftAndRightInRTL: jest.fn(),
  doLeftAndRightSwapInRTL: false,
};

export const InteractionManager = {
  runAfterInteractions: jest.fn((task?: () => void) => {
    if (task) task();
    return { then: jest.fn(), done: jest.fn(), cancel: jest.fn() };
  }),
  createInteractionHandle: jest.fn(() => 1),
  clearInteractionHandle: jest.fn(),
  setDeadline: jest.fn(),
};

export const Keyboard = {
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  dismiss: jest.fn(),
  scheduleLayoutAnimation: jest.fn(),
};

export const Linking = {
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  openURL: jest.fn(async () => true),
  canOpenURL: jest.fn(async () => true),
  getInitialURL: jest.fn(async () => null),
};

export const LogBox = {
  ignoreLogs: jest.fn(),
  ignoreAllLogs: jest.fn(),
  uninstall: jest.fn(),
  install: jest.fn(),
};

export const NativeEventEmitter = jest.fn(() => ({
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  emit: jest.fn(),
}));

export const NativeModules = {};

export const PanResponder = {
  create: jest.fn((config: any) => ({
    panHandlers: {},
  })),
};

export const PermissionsAndroid = {
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

export const Settings = {
  get: jest.fn(() => ''),
  set: jest.fn(),
  watchKeys: jest.fn(() => 0),
  clearWatch: jest.fn(),
};

export const Share = {
  share: jest.fn(async () => ({ action: 'sharedActivity' })),
  sharedAction: 'sharedAction',
  dismissedAction: 'dismissedAction',
};

export const UIManager = {
  measure: jest.fn((ref: any, callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void) => {
    callback(0, 0, 100, 100, 0, 0);
  }),
  measureInWindow: jest.fn((ref: any, callback: (x: number, y: number, width: number, height: number) => void) => {
    callback(0, 0, 100, 100);
  }),
  measureLayout: jest.fn((ref: any, relativeTo: any, onFail: () => void, onSuccess: (x: number, y: number, width: number, height: number) => void) => {
    onSuccess(0, 0, 100, 100);
  }),
  setLayoutAnimationEnabledExperimental: jest.fn(),
  configureNextLayoutAnimation: jest.fn(),
};

export const Vibration = {
  vibrate: jest.fn(),
  cancel: jest.fn(),
  VIBRATION_TYPE_IMPACT_LIGHT: 'VIBRATION_TYPE_IMPACT_LIGHT',
  VIBRATION_TYPE_IMPACT_MEDIUM: 'VIBRATION_TYPE_IMPACT_MEDIUM',
  VIBRATION_TYPE_IMPACT_HEAVY: 'VIBRATION_TYPE_IMPACT_HEAVY',
  VIBRATION_TYPE_NOTIFICATION_SUCCESS: 'VIBRATION_TYPE_NOTIFICATION_SUCCESS',
  VIBRATION_TYPE_NOTIFICATION_WARNING: 'VIBRATION_TYPE_NOTIFICATION_WARNING',
  VIBRATION_TYPE_NOTIFICATION_ERROR: 'VIBRATION_TYPE_NOTIFICATION_ERROR',
};

export const YellowBox = {
  ignoreWarnings: jest.fn(),
};

export const findNodeHandle = jest.fn(() => 1);

export const processColor = jest.fn((color: string | number) => color);

export const useColorScheme = jest.fn(() => 'light');

export const useWindowDimensions = jest.fn(() => ({
  width: 390,
  height: 844,
  scale: 2,
  fontScale: 1,
}));

// LayoutAnimation
export const LayoutAnimation = {
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
export default {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  SectionList,
  TouchableOpacity,
  TouchableHighlight,
  TouchableWithoutFeedback,
  Pressable,
  TextInput,
  Button,
  ActivityIndicator,
  Switch,
  Modal,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
  Dimensions,
  PixelRatio,
  Animated,
  AccessibilityInfo,
  Alert,
  AppRegistry,
  AppState,
  AsyncStorage,
  BackHandler,
  Clipboard,
  DeviceEventEmitter,
  Easing,
  I18nManager,
  InteractionManager,
  Keyboard,
  Linking,
  LogBox,
  NativeEventEmitter,
  NativeModules,
  PanResponder,
  PermissionsAndroid,
  Settings,
  Share,
  UIManager,
  Vibration,
  YellowBox,
  findNodeHandle,
  processColor,
  useColorScheme,
  useWindowDimensions,
  LayoutAnimation,
};
