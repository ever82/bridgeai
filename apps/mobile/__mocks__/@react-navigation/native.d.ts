export declare const NavigationContainer: jest.Mock<any, [any], any>;
export declare const useNavigation: jest.Mock<{
    navigate: jest.Mock<any, any, any>;
    goBack: jest.Mock<any, any, any>;
    reset: jest.Mock<any, any, any>;
    setParams: jest.Mock<any, any, any>;
    dispatch: jest.Mock<any, any, any>;
    isFocused: jest.Mock<boolean, [], any>;
    canGoBack: jest.Mock<boolean, [], any>;
    addListener: jest.Mock<jest.Mock<any, any, any>, [], any>;
    removeListener: jest.Mock<any, any, any>;
    setOptions: jest.Mock<any, any, any>;
    getState: jest.Mock<{}, [], any>;
    getParent: jest.Mock<null, [], any>;
    getId: jest.Mock<undefined, [], any>;
}, [], any>;
export declare const useRoute: jest.Mock<{
    key: string;
    name: string;
    params: {};
    path: undefined;
}, [], any>;
export declare const useFocusEffect: jest.Mock<any, [callback: any], any>;
export declare const useIsFocused: jest.Mock<boolean, [], any>;
export declare const createNavigationContainerRef: jest.Mock<{
    current: {
        navigate: jest.Mock<any, any, any>;
        goBack: jest.Mock<any, any, any>;
        reset: jest.Mock<any, any, any>;
        isReady: jest.Mock<boolean, [], any>;
    };
}, [], any>;
export declare const useNavigationContainerRef: jest.Mock<{
    current: {
        navigate: jest.Mock<any, any, any>;
        goBack: jest.Mock<any, any, any>;
        reset: jest.Mock<any, any, any>;
        isReady: jest.Mock<boolean, [], any>;
    };
}, [], any>;
export declare const CommonActions: {
    navigate: jest.Mock<{
        type: string;
        payload: {
            name: any;
            params: any;
        };
    }, [name: any, params: any], any>;
    goBack: jest.Mock<{
        type: string;
    }, [], any>;
    reset: jest.Mock<{
        type: string;
        payload: any;
    }, [state: any], any>;
    setParams: jest.Mock<{
        type: string;
        payload: any;
    }, [params: any], any>;
};
//# sourceMappingURL=native.d.ts.map