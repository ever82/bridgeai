import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface ScreenContainerProps {
  children: ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
  refreshable?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  keyboardAvoiding?: boolean;
  keyboardVerticalOffset?: number;
  contentContainerStyle?: ViewStyle;
  scrollViewProps?: ScrollViewProps;
  safeAreaTop?: boolean;
  safeAreaBottom?: boolean;
  backgroundColor?: string;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  scrollable = false,
  refreshable = false,
  onRefresh,
  refreshing = false,
  keyboardAvoiding = false,
  keyboardVerticalOffset = 0,
  contentContainerStyle,
  scrollViewProps,
  safeAreaTop = true,
  safeAreaBottom = true,
  backgroundColor,
}) => {
  const insets = useSafeAreaInsets();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: backgroundColor || theme.colors.background,
    paddingTop: safeAreaTop ? insets.top : 0,
    paddingBottom: safeAreaBottom ? insets.bottom : 0,
  };

  const content = scrollable ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        refreshable && onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        ) : undefined
      }
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentContainerStyle]}>{children}</View>
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={[containerStyle, style]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return <View style={[containerStyle, style]}>{content}</View>;
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
});
