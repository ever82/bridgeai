import React, { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

interface AllTheProvidersProps {
  children: ReactNode;
}

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export function AllTheProviders({ children }: AllTheProvidersProps) {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer>{children}</NavigationContainer>
    </SafeAreaProvider>
  );
}

const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing-library
export * from '@testing-library/react-native';

// Override render method
export { customRender as render };
export { AllTheProviders };
