/**
 * Test utilities for React Native Testing Library
 * Provides helper functions for common testing patterns
 */

import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';

// Re-export testing library utilities
export { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';

// Mock wrapper for testing components with providers
export const createMockWrapper = (_providers?: {
  value?: Record<string, unknown>;
  dispatch?: jest.Mock;
}) => {
  const MockWrapper = ({ children }: { children: React.ReactNode }) => (
    <View testID="mock-wrapper">{children}</View>
  );
  MockWrapper.displayName = 'MockWrapper';
  return MockWrapper;
};

// Mock navigation hook return values
export const createMockNavigation = (overrides = {}) => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  getParam: jest.fn(),
  ...overrides,
});

// Mock route object
export const createMockRoute = (params = {}) => ({
  key: 'route-key',
  name: 'RouteName',
  params,
});

// Mock async storage
export const createMockAsyncStorage = (data = {}) => {
  const store = { ...data };
  return {
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
      return Promise.resolve();
    }),
  };
};

// Mock debounce utility
export const createDebounceMock = () => {
  const mockFn = jest.fn();
  const debouncedFn = (fn: jest.Mock, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: unknown[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  };
  return { mockFn, debouncedFn };
};

// Create a simple test component
export const TestButton = ({
  onPress,
  title = 'Test Button',
  disabled = false,
  ...props
}: {
  onPress?: () => void;
  title?: string;
  disabled?: boolean;
  [key: string]: unknown;
}) => (
  <TouchableOpacity onPress={onPress} disabled={disabled} testID="test-button" {...props}>
    <Text>{title}</Text>
  </TouchableOpacity>
);

// Create a test input component
export const TestInput = ({
  value,
  onChangeText,
  placeholder = 'Enter text',
  ...props
}: {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  [key: string]: unknown;
}) => (
  <TextInput
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    testID="test-input"
    {...props}
  />
);

// Create a test list component
export const TestList = ({
  items,
  renderItem,
}: {
  items: unknown[];
  renderItem: (item: unknown, index: number) => React.ReactNode;
}) => (
  <View testID="test-list">
    {items.map((item, index) => (
      <View key={index}>{renderItem(item, index)}</View>
    ))}
  </View>
);

// Mock form state
export interface MockFormState {
  values: Record<string, string>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

export const createMockFormState = (overrides: Partial<MockFormState> = {}): MockFormState => ({
  values: {},
  errors: {},
  touched: {},
  isSubmitting: false,
  isValid: true,
  ...overrides,
});

// Create error boundary wrapper for testing error states
export const createErrorBoundaryWrapper = (
  ErrorComponent: React.ComponentType<{ error: Error }> = ({ error }) => (
    <View testID="error-boundary">
      <Text>{error.message}</Text>
    </View>
  )
) => {
  return class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error: Error | null }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    render() {
      if (this.state.hasError && this.state.error) {
        return <ErrorComponent error={this.state.error} />;
      }
      return this.props.children;
    }
  };
};

// Helper to mock console.error for specific tests
export const suppressConsoleErrors = () => {
  const originalError = console.error;
  console.error = jest.fn();
  return () => {
    console.error = originalError;
  };
};

// Helper to create a mocked API response
export const createMockApiResponse = <T,>(data: T, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
});

// Helper to create a mocked fetch
export const createMockFetch = (response: Response) => {
  return jest.fn().mockResolvedValue(response);
};

// Mock animation helper
export const createAnimationMock = () => {
  const listeners: Record<string, ((value: number) => void)[]> = {};

  return {
    addListener: jest.fn((key: string, callback: (value: number) => void) => {
      if (!listeners[key]) listeners[key] = [];
      listeners[key].push(callback);
    }),
    removeListener: jest.fn((key: string, callback: (value: number) => void) => {
      if (listeners[key]) {
        listeners[key] = listeners[key].filter(cb => cb !== callback);
      }
    }),
    removeAllListeners: jest.fn((key: string) => {
      delete listeners[key];
    }),
    setValue: jest.fn((value: number) => {
      Object.values(listeners).forEach(cbs => {
        cbs.forEach(cb => cb(value));
      });
    }),
    interpolate: jest.fn((config: { inputRange: number[]; outputRange: string[] }) => ({
      __getValue: () => config.outputRange[0],
    })),
    start: jest.fn((callback?: (finished: boolean) => void) => {
      if (callback) callback(true);
    }),
    stop: jest.fn(),
    reset: jest.fn(),
  };
};

// Time travel helper for jest.useFakeTimers
export const advanceTime = (ms: number) => {
  jest.advanceTimersByTime(ms);
};

// Helper to mock platform
export const mockPlatform = (platform: 'ios' | 'android') => {
  jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
    OS: platform,
    select: (obj: Record<string, unknown>) => obj[platform],
  }));
};

// Helper to create a test store
export const createTestStore = <T extends Record<string, unknown>>(initialState: T) => {
  let state = { ...initialState };
  const listeners: Array<(state: T) => void> = [];

  return {
    getState: () => state,
    setState: (newState: Partial<T>) => {
      state = { ...state, ...newState };
      listeners.forEach(listener => listener(state));
    },
    subscribe: (listener: (state: T) => void) => {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    },
  };
};
