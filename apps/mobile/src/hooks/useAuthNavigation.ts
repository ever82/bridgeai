import { useCallback } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuthStore } from '../stores/authStore';
import { RootStackParamList, MainTabParamList } from '../types/navigation';

type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type MainTabNavigationProp = NativeStackNavigationProp<MainTabParamList>;

interface UseAuthNavigationReturn {
  // Navigation methods
  navigateToLogin: () => void;
  navigateToRegister: () => void;
  navigateToMain: () => void;
  navigateToHome: () => void;
  navigateToMessages: () => void;
  navigateToDiscover: () => void;
  navigateToProfile: () => void;
  navigateToSettings: () => void;
  goBack: () => void;

  // Auth state
  isAuthenticated: boolean;
  isLoading: boolean;

  // Auth actions
  logout: () => Promise<void>;

  // Current route
  currentRoute: string | undefined;
}

/**
 * Custom hook for navigation with auth awareness
 * Provides convenient navigation methods and auth state
 */
export const useAuthNavigation = (): UseAuthNavigationReturn => {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute();
  const { isAuthenticated, isLoading, logout } = useAuthStore();

  const navigateToLogin = useCallback(() => {
    navigation.navigate('Auth', { screen: 'Login' });
  }, [navigation]);

  const navigateToRegister = useCallback(() => {
    navigation.navigate('Auth', { screen: 'Register' });
  }, [navigation]);

  const navigateToMain = useCallback(() => {
    navigation.navigate('Main');
  }, [navigation]);

  const navigateToHome = useCallback(() => {
    navigation.navigate('Main', { screen: 'Home' });
  }, [navigation]);

  const navigateToMessages = useCallback(() => {
    navigation.navigate('Main', { screen: 'Messages' });
  }, [navigation]);

  const navigateToDiscover = useCallback(() => {
    navigation.navigate('Main', { screen: 'Discover' });
  }, [navigation]);

  const navigateToProfile = useCallback(() => {
    navigation.navigate('Main', { screen: 'Profile' });
  }, [navigation]);

  const navigateToSettings = useCallback(() => {
    // Navigate to settings through the profile stack
    navigation.navigate('Main', {
      screen: 'Profile',
      params: { screen: 'Settings' },
    });
  }, [navigation]);

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return {
    navigateToLogin,
    navigateToRegister,
    navigateToMain,
    navigateToHome,
    navigateToMessages,
    navigateToDiscover,
    navigateToProfile,
    navigateToSettings,
    goBack: handleGoBack,
    isAuthenticated,
    isLoading,
    logout,
    currentRoute: route.name,
  };
};
