import { useEffect, useState, useCallback } from 'react';
import {
  Dimensions,
  ScaledSize,
  PixelRatio,
  Platform,
  StatusBar,
  Keyboard,
} from 'react-native';

interface ScreenDimensions {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
}

interface ScreenInfo extends ScreenDimensions {
  // Screen size categories
  isSmallScreen: boolean;
  isMediumScreen: boolean;
  isLargeScreen: boolean;

  // Orientation
  isPortrait: boolean;
  isLandscape: boolean;

  // Device type
  isPhone: boolean;
  isTablet: boolean;

  // Safe area helpers
  statusBarHeight: number;

  // Pixel ratio helpers
  pixelSizeWidth: (size: number) => number;
  pixelSizeHeight: (size: number) => number;
}

const SMALL_SCREEN_THRESHOLD = 375; // iPhone SE, mini
const LARGE_SCREEN_THRESHOLD = 768; // iPad, large tablets

/**
 * Custom hook for responsive screen dimensions
 * Provides screen size info and responsive helpers
 */
export const useScreenDimensions = (): ScreenInfo => {
  const [dimensions, setDimensions] = useState<ScreenDimensions>({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    scale: Dimensions.get('window').scale,
    fontScale: Dimensions.get('window').fontScale,
  });

  useEffect(() => {
    const handleChange = ({ window }: { window: ScaledSize }) => {
      setDimensions({
        width: window.width,
        height: window.height,
        scale: window.scale,
        fontScale: window.fontScale,
      });
    };

    const subscription = Dimensions.addEventListener('change', handleChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  const isPortrait = dimensions.height >= dimensions.width;
  const isLandscape = !isPortrait;

  const shortestDimension = Math.min(dimensions.width, dimensions.height);
  const isSmallScreen = shortestDimension < SMALL_SCREEN_THRESHOLD;
  const isLargeScreen = shortestDimension >= LARGE_SCREEN_THRESHOLD;
  const isMediumScreen = !isSmallScreen && !isLargeScreen;

  const isPhone = isPortrait && shortestDimension < LARGE_SCREEN_THRESHOLD;
  const isTablet = !isPhone;

  const pixelSizeWidth = useCallback(
    (size: number) => PixelRatio.roundToNearestPixel(size * (dimensions.width / 375)),
    [dimensions.width]
  );

  const pixelSizeHeight = useCallback(
    (size: number) => PixelRatio.roundToNearestPixel(size * (dimensions.height / 812)),
    [dimensions.height]
  );

  return {
    ...dimensions,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    isPortrait,
    isLandscape,
    isPhone,
    isTablet,
    statusBarHeight: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 24),
    pixelSizeWidth,
    pixelSizeHeight,
  };
};

/**
 * Hook to detect keyboard visibility
 */
export const useKeyboard = () => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return { isKeyboardVisible, keyboardHeight };
};
