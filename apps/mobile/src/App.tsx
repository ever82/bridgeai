import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { RootNavigator } from './navigation/RootNavigator';
import { initSentry, withErrorBoundary } from './utils/sentry';
import { ErrorBoundary } from './components/ErrorBoundary';

// Initialize Sentry
initSentry();

function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <RootNavigator />
          <StatusBar style="auto" />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Wrap app with Sentry error boundary
export default withErrorBoundary(App);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
