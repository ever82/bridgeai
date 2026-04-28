import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore } from '../stores/authStore';
import { RootStackParamList } from '../types/navigation';
import { theme } from '../theme';
import { PrivacyEditor } from '../screens/VisionShare/PrivacyEditor';

import { AuthNavigator } from './AuthNavigator';
import { DrawerNavigator } from './DrawerNavigator';
import { linking } from './linking';

const Stack = createNativeStackNavigator<RootStackParamList>();

const NAVIGATION_STATE_KEY = 'NAVIGATION_STATE';

export const RootNavigator = () => {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const routeNameRef = useRef<string | undefined>();

  useEffect(() => {
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      linking={linking}
      onReady={() => {
        routeNameRef.current = undefined;
      }}
      onStateChange={async state => {
        if (state) {
          try {
            const stateJson = JSON.stringify(state);
            await AsyncStorage.setItem(NAVIGATION_STATE_KEY, stateJson);
          } catch {
            // Silently ignore persistence errors
          }
        }
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={DrawerNavigator} />
            <Stack.Screen name="PrivacyEditor" component={PrivacyEditor} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
