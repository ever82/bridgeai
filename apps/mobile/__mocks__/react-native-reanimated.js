// Mock for react-native-reanimated on web
// This provides a no-op implementation for web builds
const NOOP = () => {};

// Mock View component (will be replaced by react-native mock)
const View = () => null;
const Text = () => null;

// Simplified Animated implementation
const Animated = {
  View: View,
  Text: Text,
  createAnimatedComponent: Component => Component,
  Value: class {
    constructor(val) {
      this._value = val;
    }
    setValue(val) {
      this._value = val;
    }
    getValue() {
      return this._value;
    }
    interpolate(config) {
      return { _interpolation: config, _value: this };
    }
  },
  Event: {},
  add: NOOP,
  sub: NOOP,
  multiply: NOOP,
  divide: NOOP,
  modulo: NOOP,
  diff: NOOP,
  diffClamp: NOOP,
  clamp: NOOP,
  set: NOOP,
  cond: NOOP,
  eq: NOOP,
  neq: NOOP,
  lessThan: NOOP,
  lessOrEq: NOOP,
  greaterThan: NOOP,
  greaterOrEq: NOOP,
  block: NOOP,
  call: NOOP,
  debug: NOOP,
  clockTest: NOOP,
  clockNot: NOOP,
  clockOr: NOOP,
  clockAnd: NOOP,
  default: NOOP,
  Extrapolate: { EXTEND: 'extend', CLAMP: 'clamp', IDENTITY: 'identity' },
  timing: NOOP,
  spring: NOOP,
  decay: NOOP,
  delay: NOOP,
  sequence: NOOP,
  parallel: NOOP,
  stagger: NOOP,
  loop: NOOP,
  event: NOOP,
};

const Reanimated = {
  ...Animated,
  useSharedValue: initial => ({ value: initial }),
  useAnimatedStyle: updater => updater(),
  useDerivedValue: updater => ({ value: updater() }),
  useAnimatedGestureHandler: handlers => handlers,
  useAnimatedScrollHandler: handlers => handlers,
  useAnimatedRef: () => ({ current: null }),
  runOnJS: fn => fn,
  runOnUI: fn => fn,
  createAnimatedComponent: Component => Component,
  withSpring: value => value,
  withTiming: value => value,
  withDecay: value => value,
  withDelay: (value, anim) => anim,
  withSequence: (...anims) => anims[0],
  withRepeat: anim => anim,
  Easing: {
    linear: t => t,
    ease: t => t,
    quad: t => t * t,
    cubic: t => t * t * t,
    poly: n => t => Math.pow(t, n),
    sin: t => Math.sin(t),
    circle: t => 1 - Math.sqrt(1 - t * t),
    exp: t => Math.pow(2, 10 * (t - 1)),
    elastic: t => Math.sin((-13 * (t + 1) * Math.PI) / 2) * Math.pow(2, -10 * t) + 1,
    back: t => t * t * (3 * t - 2),
    bounce: t => {
      if (t < 1 / 2.75) return 7.5625 * t * t;
      if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
      if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    },
    bezier: () => t => t,
  },
  spring: value => value,
  timing: value => value,
  FadeIn: { duration: () => ({}) },
  FadeOut: { duration: () => ({}) },
  SlideInDown: {},
  SlideOutUp: {},
  SlideInUp: {},
  SlideOutDown: {},
  Layout: { fadeTransition: () => ({}) },
  SlideInLeft: {},
  SlideOutLeft: {},
  SlideInRight: {},
  SlideOutRight: {},
  ZoomIn: { duration: () => ({}) },
  ZoomOut: { duration: () => ({}) },
  BounceIn: {},
  BounceOut: {},
  FlipInXUp: {},
  FlipOutXUp: {},
  LightSpeedInLeft: {},
  LightSpeedOutLeft: {},
  RollInFromLeft: {},
  RollOutToLeft: {},
};

module.exports = Reanimated;
module.exports.default = Reanimated;
