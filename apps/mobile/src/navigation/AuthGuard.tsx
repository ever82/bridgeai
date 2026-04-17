import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuthStore } from '../stores/authStore';
import { RootStackParamList } from '../types/navigation';
import { theme } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

/**
 * AuthGuard component - Protects routes that require authentication
 * Can also be used to protect routes that require guest access (requireAuth=false)
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback,
  requireAuth = true,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isAuthenticated) {
        // Redirect to login if authentication is required but user is not authenticated
        navigation.replace('Auth');
      } else if (!requireAuth && isAuthenticated) {
        // Redirect to main if guest access is required but user is authenticated
        navigation.replace('Main');
      }
    }
  }, [isAuthenticated, isLoading, navigation, requireAuth]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Check if we should show the children
  const shouldShowChildren = requireAuth ? isAuthenticated : !isAuthenticated;

  if (!shouldShowChildren) {
    return fallback || <View style={styles.emptyContainer} />;
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
