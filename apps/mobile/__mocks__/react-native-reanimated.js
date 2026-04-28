"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrollTo = exports.measure = exports.cancelAnimation = exports.createAnimatedComponent = exports.useAnimatedProps = exports.useAnimatedScrollHandler = exports.useAnimatedGestureHandler = exports.useAnimatedReaction = exports.Easing = exports.Extrapolate = exports.interpolate = exports.withRepeat = exports.withSequence = exports.withDelay = exports.withDecay = exports.withTiming = exports.withSpring = exports.runOnUI = exports.runOnJS = exports.useDerivedValue = exports.useAnimatedStyle = exports.useSharedValue = void 0;
// React Native Reanimated mock
exports.default = {
    default: {
        call: jest.fn(),
        createAnimatedComponent: jest.fn(component => component),
        event: jest.fn(),
        interpolate: jest.fn(),
        loop: jest.fn(),
        runOnJS: jest.fn(fn => fn),
        runOnUI: jest.fn(fn => fn),
        useAnimatedGestureHandler: jest.fn(() => () => { }),
        useAnimatedProps: jest.fn(() => ({})),
        useAnimatedReaction: jest.fn(),
        useAnimatedRef: jest.fn(() => ({ current: null })),
        useAnimatedScrollHandler: jest.fn(() => () => { }),
        useAnimatedStyle: jest.fn(() => ({})),
        useDerivedValue: jest.fn(fn => ({ value: fn() })),
        useEvent: jest.fn(() => ({})),
        useHandler: jest.fn(() => ({})),
        useSharedValue: jest.fn(init => ({ value: init })),
        Value: jest.fn(),
    },
};
exports.useSharedValue = jest.fn(init => ({ value: init }));
exports.useAnimatedStyle = jest.fn(() => ({}));
exports.useDerivedValue = jest.fn(fn => ({ value: fn() }));
exports.runOnJS = jest.fn(fn => fn);
exports.runOnUI = jest.fn(fn => fn);
exports.withSpring = jest.fn(value => value);
exports.withTiming = jest.fn(value => value);
exports.withDecay = jest.fn(value => value);
exports.withDelay = jest.fn((_, value) => value);
exports.withSequence = jest.fn((...args) => args[args.length - 1]);
exports.withRepeat = jest.fn(value => value);
exports.interpolate = jest.fn((value, _input, _output) => value);
exports.Extrapolate = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };
exports.Easing = {
    linear: jest.fn(t => t),
    ease: jest.fn(t => t),
    quad: jest.fn(t => t * t),
    cubic: jest.fn(t => t * t * t),
};
exports.useAnimatedReaction = jest.fn();
exports.useAnimatedGestureHandler = jest.fn(() => () => { });
exports.useAnimatedScrollHandler = jest.fn(() => () => { });
exports.useAnimatedProps = jest.fn(() => ({}));
exports.createAnimatedComponent = jest.fn(component => component);
exports.cancelAnimation = jest.fn();
exports.measure = jest.fn(() => ({ x: 0, y: 0, width: 0, height: 0, pageX: 0, pageY: 0 }));
exports.scrollTo = jest.fn();
//# sourceMappingURL=react-native-reanimated.js.map