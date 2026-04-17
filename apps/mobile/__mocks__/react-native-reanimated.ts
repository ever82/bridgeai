// React Native Reanimated mock
export default {
  default: {
    call: jest.fn(),
    createAnimatedComponent: jest.fn(component => component),
    event: jest.fn(),
    interpolate: jest.fn(),
    loop: jest.fn(),
    runOnJS: jest.fn(fn => fn),
    runOnUI: jest.fn(fn => fn),
    useAnimatedGestureHandler: jest.fn(() => () => {}),
    useAnimatedProps: jest.fn(() => ({})),
    useAnimatedReaction: jest.fn(),
    useAnimatedRef: jest.fn(() => ({ current: null })),
    useAnimatedScrollHandler: jest.fn(() => () => {}),
    useAnimatedStyle: jest.fn(() => ({})),
    useDerivedValue: jest.fn(fn => ({ value: fn() })),
    useEvent: jest.fn(() => ({})),
    useHandler: jest.fn(() => ({})),
    useSharedValue: jest.fn(init => ({ value: init })),
    Value: jest.fn(),
  },
};

export const useSharedValue = jest.fn(init => ({ value: init }));
export const useAnimatedStyle = jest.fn(() => ({}));
export const useDerivedValue = jest.fn(fn => ({ value: fn() }));
export const runOnJS = jest.fn(fn => fn);
export const runOnUI = jest.fn(fn => fn);
export const withSpring = jest.fn(value => value);
export const withTiming = jest.fn(value => value);
export const withDecay = jest.fn(value => value);
export const withDelay = jest.fn((_, value) => value);
export const withSequence = jest.fn((...args) => args[args.length - 1]);
export const withRepeat = jest.fn(value => value);
export const interpolate = jest.fn((value, _input, _output) => value);
export const Extrapolate = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };
export const Easing = {
  linear: jest.fn(t => t),
  ease: jest.fn(t => t),
  quad: jest.fn(t => t * t),
  cubic: jest.fn(t => t * t * t),
};
export const useAnimatedReaction = jest.fn();
export const useAnimatedGestureHandler = jest.fn(() => () => {});
export const useAnimatedScrollHandler = jest.fn(() => () => {});
export const useAnimatedProps = jest.fn(() => ({}));
export const createAnimatedComponent = jest.fn(component => component);
export const cancelAnimation = jest.fn();
export const measure = jest.fn(() => ({ x: 0, y: 0, width: 0, height: 0, pageX: 0, pageY: 0 }));
export const scrollTo = jest.fn();
