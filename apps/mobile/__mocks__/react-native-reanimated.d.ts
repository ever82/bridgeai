declare const _default: {
    default: {
        call: jest.Mock<any, any, any>;
        createAnimatedComponent: jest.Mock<any, [component: any], any>;
        event: jest.Mock<any, any, any>;
        interpolate: jest.Mock<any, any, any>;
        loop: jest.Mock<any, any, any>;
        runOnJS: jest.Mock<any, [fn: any], any>;
        runOnUI: jest.Mock<any, [fn: any], any>;
        useAnimatedGestureHandler: jest.Mock<() => void, [], any>;
        useAnimatedProps: jest.Mock<{}, [], any>;
        useAnimatedReaction: jest.Mock<any, any, any>;
        useAnimatedRef: jest.Mock<{
            current: null;
        }, [], any>;
        useAnimatedScrollHandler: jest.Mock<() => void, [], any>;
        useAnimatedStyle: jest.Mock<{}, [], any>;
        useDerivedValue: jest.Mock<{
            value: any;
        }, [fn: any], any>;
        useEvent: jest.Mock<{}, [], any>;
        useHandler: jest.Mock<{}, [], any>;
        useSharedValue: jest.Mock<{
            value: any;
        }, [init: any], any>;
        Value: jest.Mock<any, any, any>;
    };
};
export default _default;
export declare const useSharedValue: jest.Mock<{
    value: any;
}, [init: any], any>;
export declare const useAnimatedStyle: jest.Mock<{}, [], any>;
export declare const useDerivedValue: jest.Mock<{
    value: any;
}, [fn: any], any>;
export declare const runOnJS: jest.Mock<any, [fn: any], any>;
export declare const runOnUI: jest.Mock<any, [fn: any], any>;
export declare const withSpring: jest.Mock<any, [value: any], any>;
export declare const withTiming: jest.Mock<any, [value: any], any>;
export declare const withDecay: jest.Mock<any, [value: any], any>;
export declare const withDelay: jest.Mock<any, [_: any, value: any], any>;
export declare const withSequence: jest.Mock<any, any[], any>;
export declare const withRepeat: jest.Mock<any, [value: any], any>;
export declare const interpolate: jest.Mock<any, [value: any, _input: any, _output: any], any>;
export declare const Extrapolate: {
    CLAMP: string;
    EXTEND: string;
    IDENTITY: string;
};
export declare const Easing: {
    linear: jest.Mock<any, [t: any], any>;
    ease: jest.Mock<any, [t: any], any>;
    quad: jest.Mock<number, [t: any], any>;
    cubic: jest.Mock<number, [t: any], any>;
};
export declare const useAnimatedReaction: jest.Mock<any, any, any>;
export declare const useAnimatedGestureHandler: jest.Mock<() => void, [], any>;
export declare const useAnimatedScrollHandler: jest.Mock<() => void, [], any>;
export declare const useAnimatedProps: jest.Mock<{}, [], any>;
export declare const createAnimatedComponent: jest.Mock<any, [component: any], any>;
export declare const cancelAnimation: jest.Mock<any, any, any>;
export declare const measure: jest.Mock<{
    x: number;
    y: number;
    width: number;
    height: number;
    pageX: number;
    pageY: number;
}, [], any>;
export declare const scrollTo: jest.Mock<any, any, any>;
//# sourceMappingURL=react-native-reanimated.d.ts.map