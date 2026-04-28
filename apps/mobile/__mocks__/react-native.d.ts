import React from 'react';
export declare const View: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
export declare const Text: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
export declare const Image: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
export declare const ScrollView: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
export declare const FlatList: any;
export declare const SectionList: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
export declare const TouchableOpacity: jest.Mock<React.FunctionComponentElement<any>, [props: any], any>;
export declare const TouchableHighlight: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
export declare const TouchableWithoutFeedback: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
export declare const Pressable: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
export declare const TextInput: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
export declare const Button: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
export declare const ActivityIndicator: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
export declare const Switch: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
export declare const Modal: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
export declare const SafeAreaView: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
export declare const StatusBar: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
export declare const KeyboardAvoidingView: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
export declare const StyleSheet: {
    create: (styles: any) => any;
    flatten: (styles: any) => any;
};
export declare const Platform: {
    OS: string;
    select: jest.Mock<any, [obj: any], any>;
    Version: string;
};
export declare const Dimensions: {
    get: jest.Mock<{
        width: number;
        height: number;
        scale: number;
        fontScale: number;
    }, [], any>;
    addEventListener: jest.Mock<{
        remove: jest.Mock<any, any, any>;
    }, [], any>;
    removeEventListener: jest.Mock<any, any, any>;
};
export declare const PixelRatio: {
    get: jest.Mock<number, [], any>;
    getFontScale: jest.Mock<number, [], any>;
    getPixelSizeForLayoutSize: jest.Mock<number, [size: number], any>;
    roundToNearestPixel: jest.Mock<number, [size: number], any>;
};
export declare const Animated: any;
export declare const AccessibilityInfo: {
    isScreenReaderEnabled: jest.Mock<Promise<boolean>, [], any>;
    addEventListener: jest.Mock<{
        remove: jest.Mock<any, any, any>;
    }, [], any>;
    removeEventListener: jest.Mock<any, any, any>;
    setAccessibilityFocus: jest.Mock<any, any, any>;
    announceForAccessibility: jest.Mock<any, any, any>;
};
export declare const Alert: {
    alert: jest.Mock<any, any, any>;
    prompt: jest.Mock<any, any, any>;
};
export declare const AppRegistry: {
    registerComponent: jest.Mock<any, any, any>;
    registerRunnable: jest.Mock<any, any, any>;
    registerSection: jest.Mock<any, any, any>;
    getApplication: jest.Mock<any, any, any>;
    runApplication: jest.Mock<any, any, any>;
};
export declare const AppState: {
    addEventListener: jest.Mock<{
        remove: jest.Mock<any, any, any>;
    }, [], any>;
    removeEventListener: jest.Mock<any, any, any>;
    currentState: string;
};
export declare const AsyncStorage: {
    getItem: jest.Mock<Promise<null>, [], any>;
    setItem: jest.Mock<Promise<void>, [], any>;
    removeItem: jest.Mock<Promise<void>, [], any>;
    mergeItem: jest.Mock<Promise<void>, [], any>;
    clear: jest.Mock<Promise<void>, [], any>;
    getAllKeys: jest.Mock<Promise<never[]>, [], any>;
    flushGetRequests: jest.Mock<any, any, any>;
    multiGet: jest.Mock<Promise<never[]>, [], any>;
    multiSet: jest.Mock<Promise<void>, [], any>;
    multiRemove: jest.Mock<Promise<void>, [], any>;
    multiMerge: jest.Mock<Promise<void>, [], any>;
};
export declare const BackHandler: {
    addEventListener: jest.Mock<{
        remove: jest.Mock<any, any, any>;
    }, [], any>;
    removeEventListener: jest.Mock<any, any, any>;
    exitApp: jest.Mock<any, any, any>;
};
export declare const Clipboard: {
    getString: jest.Mock<Promise<string>, [], any>;
    setString: jest.Mock<any, any, any>;
};
export declare const DeviceEventEmitter: {
    addListener: jest.Mock<{
        remove: jest.Mock<any, any, any>;
    }, [], any>;
    removeListener: jest.Mock<any, any, any>;
    removeAllListeners: jest.Mock<any, any, any>;
    emit: jest.Mock<any, any, any>;
};
export declare const Easing: {
    linear: jest.Mock<number, [t: number], any>;
    ease: jest.Mock<number, [t: number], any>;
    quad: jest.Mock<number, [t: number], any>;
    cubic: jest.Mock<number, [t: number], any>;
    poly: jest.Mock<(t: number) => number, [n: number], any>;
    sin: jest.Mock<number, [t: number], any>;
    circle: jest.Mock<number, [t: number], any>;
    exp: jest.Mock<number, [t: number], any>;
    elastic: jest.Mock<(t: number) => number, [bounciness?: number | undefined], any>;
    back: jest.Mock<(t: number) => number, [s?: number | undefined], any>;
    bounce: jest.Mock<number, [t: number], any>;
    bezier: jest.Mock<(t: number) => number, [x1: number, y1: number, x2: number, y2: number], any>;
    in: jest.Mock<(t: number) => number, [easing: (t: number) => number], any>;
    out: jest.Mock<(t: number) => number, [easing: (t: number) => number], any>;
    inOut: jest.Mock<(t: number) => number, [easing: (t: number) => number], any>;
};
export declare const I18nManager: {
    isRTL: boolean;
    allowRTL: jest.Mock<any, any, any>;
    forceRTL: jest.Mock<any, any, any>;
    swapLeftAndRightInRTL: jest.Mock<any, any, any>;
    doLeftAndRightSwapInRTL: boolean;
};
export declare const InteractionManager: {
    runAfterInteractions: jest.Mock<{
        then: jest.Mock<any, any, any>;
        done: jest.Mock<any, any, any>;
        cancel: jest.Mock<any, any, any>;
    }, [task?: (() => void) | undefined], any>;
    createInteractionHandle: jest.Mock<number, [], any>;
    clearInteractionHandle: jest.Mock<any, any, any>;
    setDeadline: jest.Mock<any, any, any>;
};
export declare const Keyboard: {
    addListener: jest.Mock<{
        remove: jest.Mock<any, any, any>;
    }, [], any>;
    removeListener: jest.Mock<any, any, any>;
    removeAllListeners: jest.Mock<any, any, any>;
    dismiss: jest.Mock<any, any, any>;
    scheduleLayoutAnimation: jest.Mock<any, any, any>;
};
export declare const Linking: {
    addEventListener: jest.Mock<{
        remove: jest.Mock<any, any, any>;
    }, [], any>;
    removeEventListener: jest.Mock<any, any, any>;
    openURL: jest.Mock<Promise<boolean>, [], any>;
    canOpenURL: jest.Mock<Promise<boolean>, [], any>;
    getInitialURL: jest.Mock<Promise<null>, [], any>;
};
export declare const LogBox: {
    ignoreLogs: jest.Mock<any, any, any>;
    ignoreAllLogs: jest.Mock<any, any, any>;
    uninstall: jest.Mock<any, any, any>;
    install: jest.Mock<any, any, any>;
};
export declare const NativeEventEmitter: jest.Mock<{
    addListener: jest.Mock<{
        remove: jest.Mock<any, any, any>;
    }, [], any>;
    removeListener: jest.Mock<any, any, any>;
    removeAllListeners: jest.Mock<any, any, any>;
    emit: jest.Mock<any, any, any>;
}, [], any>;
export declare const NativeModules: {};
export declare const PanResponder: {
    create: jest.Mock<{
        panHandlers: {};
    }, [config: any], any>;
};
export declare const PermissionsAndroid: {
    request: jest.Mock<Promise<string>, [], any>;
    requestMultiple: jest.Mock<Promise<{}>, [], any>;
    check: jest.Mock<Promise<boolean>, [], any>;
    PERMISSIONS: {};
    RESULTS: {
        GRANTED: string;
        DENIED: string;
        NEVER_ASK_AGAIN: string;
    };
};
export declare const Settings: {
    get: jest.Mock<string, [], any>;
    set: jest.Mock<any, any, any>;
    watchKeys: jest.Mock<number, [], any>;
    clearWatch: jest.Mock<any, any, any>;
};
export declare const Share: {
    share: jest.Mock<Promise<{
        action: string;
    }>, [], any>;
    sharedAction: string;
    dismissedAction: string;
};
export declare const UIManager: {
    measure: jest.Mock<void, [ref: any, callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void], any>;
    measureInWindow: jest.Mock<void, [ref: any, callback: (x: number, y: number, width: number, height: number) => void], any>;
    measureLayout: jest.Mock<void, [ref: any, relativeTo: any, onFail: () => void, onSuccess: (x: number, y: number, width: number, height: number) => void], any>;
    setLayoutAnimationEnabledExperimental: jest.Mock<any, any, any>;
    configureNextLayoutAnimation: jest.Mock<any, any, any>;
};
export declare const Vibration: {
    vibrate: jest.Mock<any, any, any>;
    cancel: jest.Mock<any, any, any>;
    VIBRATION_TYPE_IMPACT_LIGHT: string;
    VIBRATION_TYPE_IMPACT_MEDIUM: string;
    VIBRATION_TYPE_IMPACT_HEAVY: string;
    VIBRATION_TYPE_NOTIFICATION_SUCCESS: string;
    VIBRATION_TYPE_NOTIFICATION_WARNING: string;
    VIBRATION_TYPE_NOTIFICATION_ERROR: string;
};
export declare const YellowBox: {
    ignoreWarnings: jest.Mock<any, any, any>;
};
export declare const findNodeHandle: jest.Mock<number, [], any>;
export declare const processColor: jest.Mock<string | number, [color: string | number], any>;
export declare const useColorScheme: jest.Mock<string, [], any>;
export declare const useWindowDimensions: jest.Mock<{
    width: number;
    height: number;
    scale: number;
    fontScale: number;
}, [], any>;
export declare const LayoutAnimation: {
    configureNext: jest.Mock<any, any, any>;
    create: jest.Mock<{}, [], any>;
    checkConfig: jest.Mock<any, any, any>;
    Presets: {
        easeInEaseOut: string;
        linear: string;
        spring: string;
    };
    Types: {
        spring: string;
        linear: string;
        easeInEaseOut: string;
        easeIn: string;
        easeOut: string;
        keyboard: string;
    };
    Properties: {
        opacity: string;
        scaleXY: string;
    };
};
declare const _default: {
    View: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
    Text: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
    Image: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
    ScrollView: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
    FlatList: any;
    SectionList: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
    TouchableOpacity: jest.Mock<React.FunctionComponentElement<any>, [props: any], any>;
    TouchableHighlight: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
    TouchableWithoutFeedback: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
    Pressable: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
    TextInput: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
    Button: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
    ActivityIndicator: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
    Switch: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
    Modal: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
    SafeAreaView: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
    StatusBar: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
    KeyboardAvoidingView: jest.Mock<React.DOMElement<any, Element>, [props: any], any>;
    StyleSheet: {
        create: (styles: any) => any;
        flatten: (styles: any) => any;
    };
    Platform: {
        OS: string;
        select: jest.Mock<any, [obj: any], any>;
        Version: string;
    };
    Dimensions: {
        get: jest.Mock<{
            width: number;
            height: number;
            scale: number;
            fontScale: number;
        }, [], any>;
        addEventListener: jest.Mock<{
            remove: jest.Mock<any, any, any>;
        }, [], any>;
        removeEventListener: jest.Mock<any, any, any>;
    };
    PixelRatio: {
        get: jest.Mock<number, [], any>;
        getFontScale: jest.Mock<number, [], any>;
        getPixelSizeForLayoutSize: jest.Mock<number, [size: number], any>;
        roundToNearestPixel: jest.Mock<number, [size: number], any>;
    };
    Animated: any;
    AccessibilityInfo: {
        isScreenReaderEnabled: jest.Mock<Promise<boolean>, [], any>;
        addEventListener: jest.Mock<{
            remove: jest.Mock<any, any, any>;
        }, [], any>;
        removeEventListener: jest.Mock<any, any, any>;
        setAccessibilityFocus: jest.Mock<any, any, any>;
        announceForAccessibility: jest.Mock<any, any, any>;
    };
    Alert: {
        alert: jest.Mock<any, any, any>;
        prompt: jest.Mock<any, any, any>;
    };
    AppRegistry: {
        registerComponent: jest.Mock<any, any, any>;
        registerRunnable: jest.Mock<any, any, any>;
        registerSection: jest.Mock<any, any, any>;
        getApplication: jest.Mock<any, any, any>;
        runApplication: jest.Mock<any, any, any>;
    };
    AppState: {
        addEventListener: jest.Mock<{
            remove: jest.Mock<any, any, any>;
        }, [], any>;
        removeEventListener: jest.Mock<any, any, any>;
        currentState: string;
    };
    AsyncStorage: {
        getItem: jest.Mock<Promise<null>, [], any>;
        setItem: jest.Mock<Promise<void>, [], any>;
        removeItem: jest.Mock<Promise<void>, [], any>;
        mergeItem: jest.Mock<Promise<void>, [], any>;
        clear: jest.Mock<Promise<void>, [], any>;
        getAllKeys: jest.Mock<Promise<never[]>, [], any>;
        flushGetRequests: jest.Mock<any, any, any>;
        multiGet: jest.Mock<Promise<never[]>, [], any>;
        multiSet: jest.Mock<Promise<void>, [], any>;
        multiRemove: jest.Mock<Promise<void>, [], any>;
        multiMerge: jest.Mock<Promise<void>, [], any>;
    };
    BackHandler: {
        addEventListener: jest.Mock<{
            remove: jest.Mock<any, any, any>;
        }, [], any>;
        removeEventListener: jest.Mock<any, any, any>;
        exitApp: jest.Mock<any, any, any>;
    };
    Clipboard: {
        getString: jest.Mock<Promise<string>, [], any>;
        setString: jest.Mock<any, any, any>;
    };
    DeviceEventEmitter: {
        addListener: jest.Mock<{
            remove: jest.Mock<any, any, any>;
        }, [], any>;
        removeListener: jest.Mock<any, any, any>;
        removeAllListeners: jest.Mock<any, any, any>;
        emit: jest.Mock<any, any, any>;
    };
    Easing: {
        linear: jest.Mock<number, [t: number], any>;
        ease: jest.Mock<number, [t: number], any>;
        quad: jest.Mock<number, [t: number], any>;
        cubic: jest.Mock<number, [t: number], any>;
        poly: jest.Mock<(t: number) => number, [n: number], any>;
        sin: jest.Mock<number, [t: number], any>;
        circle: jest.Mock<number, [t: number], any>;
        exp: jest.Mock<number, [t: number], any>;
        elastic: jest.Mock<(t: number) => number, [bounciness?: number | undefined], any>;
        back: jest.Mock<(t: number) => number, [s?: number | undefined], any>;
        bounce: jest.Mock<number, [t: number], any>;
        bezier: jest.Mock<(t: number) => number, [x1: number, y1: number, x2: number, y2: number], any>;
        in: jest.Mock<(t: number) => number, [easing: (t: number) => number], any>;
        out: jest.Mock<(t: number) => number, [easing: (t: number) => number], any>;
        inOut: jest.Mock<(t: number) => number, [easing: (t: number) => number], any>;
    };
    I18nManager: {
        isRTL: boolean;
        allowRTL: jest.Mock<any, any, any>;
        forceRTL: jest.Mock<any, any, any>;
        swapLeftAndRightInRTL: jest.Mock<any, any, any>;
        doLeftAndRightSwapInRTL: boolean;
    };
    InteractionManager: {
        runAfterInteractions: jest.Mock<{
            then: jest.Mock<any, any, any>;
            done: jest.Mock<any, any, any>;
            cancel: jest.Mock<any, any, any>;
        }, [task?: (() => void) | undefined], any>;
        createInteractionHandle: jest.Mock<number, [], any>;
        clearInteractionHandle: jest.Mock<any, any, any>;
        setDeadline: jest.Mock<any, any, any>;
    };
    Keyboard: {
        addListener: jest.Mock<{
            remove: jest.Mock<any, any, any>;
        }, [], any>;
        removeListener: jest.Mock<any, any, any>;
        removeAllListeners: jest.Mock<any, any, any>;
        dismiss: jest.Mock<any, any, any>;
        scheduleLayoutAnimation: jest.Mock<any, any, any>;
    };
    Linking: {
        addEventListener: jest.Mock<{
            remove: jest.Mock<any, any, any>;
        }, [], any>;
        removeEventListener: jest.Mock<any, any, any>;
        openURL: jest.Mock<Promise<boolean>, [], any>;
        canOpenURL: jest.Mock<Promise<boolean>, [], any>;
        getInitialURL: jest.Mock<Promise<null>, [], any>;
    };
    LogBox: {
        ignoreLogs: jest.Mock<any, any, any>;
        ignoreAllLogs: jest.Mock<any, any, any>;
        uninstall: jest.Mock<any, any, any>;
        install: jest.Mock<any, any, any>;
    };
    NativeEventEmitter: jest.Mock<{
        addListener: jest.Mock<{
            remove: jest.Mock<any, any, any>;
        }, [], any>;
        removeListener: jest.Mock<any, any, any>;
        removeAllListeners: jest.Mock<any, any, any>;
        emit: jest.Mock<any, any, any>;
    }, [], any>;
    NativeModules: {};
    PanResponder: {
        create: jest.Mock<{
            panHandlers: {};
        }, [config: any], any>;
    };
    PermissionsAndroid: {
        request: jest.Mock<Promise<string>, [], any>;
        requestMultiple: jest.Mock<Promise<{}>, [], any>;
        check: jest.Mock<Promise<boolean>, [], any>;
        PERMISSIONS: {};
        RESULTS: {
            GRANTED: string;
            DENIED: string;
            NEVER_ASK_AGAIN: string;
        };
    };
    Settings: {
        get: jest.Mock<string, [], any>;
        set: jest.Mock<any, any, any>;
        watchKeys: jest.Mock<number, [], any>;
        clearWatch: jest.Mock<any, any, any>;
    };
    Share: {
        share: jest.Mock<Promise<{
            action: string;
        }>, [], any>;
        sharedAction: string;
        dismissedAction: string;
    };
    UIManager: {
        measure: jest.Mock<void, [ref: any, callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void], any>;
        measureInWindow: jest.Mock<void, [ref: any, callback: (x: number, y: number, width: number, height: number) => void], any>;
        measureLayout: jest.Mock<void, [ref: any, relativeTo: any, onFail: () => void, onSuccess: (x: number, y: number, width: number, height: number) => void], any>;
        setLayoutAnimationEnabledExperimental: jest.Mock<any, any, any>;
        configureNextLayoutAnimation: jest.Mock<any, any, any>;
    };
    Vibration: {
        vibrate: jest.Mock<any, any, any>;
        cancel: jest.Mock<any, any, any>;
        VIBRATION_TYPE_IMPACT_LIGHT: string;
        VIBRATION_TYPE_IMPACT_MEDIUM: string;
        VIBRATION_TYPE_IMPACT_HEAVY: string;
        VIBRATION_TYPE_NOTIFICATION_SUCCESS: string;
        VIBRATION_TYPE_NOTIFICATION_WARNING: string;
        VIBRATION_TYPE_NOTIFICATION_ERROR: string;
    };
    YellowBox: {
        ignoreWarnings: jest.Mock<any, any, any>;
    };
    findNodeHandle: jest.Mock<number, [], any>;
    processColor: jest.Mock<string | number, [color: string | number], any>;
    useColorScheme: jest.Mock<string, [], any>;
    useWindowDimensions: jest.Mock<{
        width: number;
        height: number;
        scale: number;
        fontScale: number;
    }, [], any>;
    LayoutAnimation: {
        configureNext: jest.Mock<any, any, any>;
        create: jest.Mock<{}, [], any>;
        checkConfig: jest.Mock<any, any, any>;
        Presets: {
            easeInEaseOut: string;
            linear: string;
            spring: string;
        };
        Types: {
            spring: string;
            linear: string;
            easeInEaseOut: string;
            easeIn: string;
            easeOut: string;
            keyboard: string;
        };
        Properties: {
            opacity: string;
            scaleXY: string;
        };
    };
};
export default _default;
//# sourceMappingURL=react-native.d.ts.map