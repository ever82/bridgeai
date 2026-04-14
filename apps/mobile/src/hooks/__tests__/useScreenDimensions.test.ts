import { renderHook } from '@testing-library/react-native';
import { useScreenDimensions } from '../useScreenDimensions';

// Mock Dimensions
const mockDimensions = {
  width: 375,
  height: 812,
  scale: 2,
  fontScale: 1,
};

jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => mockDimensions),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  ScaledSize: {},
  PixelRatio: {
    roundToNearestPixel: jest.fn((size) => size),
  },
  Platform: {
    OS: 'ios',
  },
  StatusBar: {
    currentHeight: 44,
  },
}));

describe('useScreenDimensions', () => {
  it('returns screen dimensions', () => {
    const { result } = renderHook(() => useScreenDimensions());

    expect(result.current.width).toBe(375);
    expect(result.current.height).toBe(812);
    expect(result.current.scale).toBe(2);
    expect(result.current.fontScale).toBe(1);
  });

  it('calculates orientation correctly', () => {
    const { result } = renderHook(() => useScreenDimensions());

    expect(result.current.isPortrait).toBe(true);
    expect(result.current.isLandscape).toBe(false);
  });

  it('calculates screen size category correctly', () => {
    const { result } = renderHook(() => useScreenDimensions());

    expect(result.current.isSmallScreen).toBe(false);
    expect(result.current.isMediumScreen).toBe(true);
    expect(result.current.isLargeScreen).toBe(false);
  });

  it('calculates device type correctly', () => {
    const { result } = renderHook(() => useScreenDimensions());

    expect(result.current.isPhone).toBe(true);
    expect(result.current.isTablet).toBe(false);
  });

  it('provides pixel size helpers', () => {
    const { result } = renderHook(() => useScreenDimensions());

    expect(typeof result.current.pixelSizeWidth).toBe('function');
    expect(typeof result.current.pixelSizeHeight).toBe('function');
  });
});
