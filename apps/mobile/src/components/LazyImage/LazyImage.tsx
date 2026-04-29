import React, { useState, useCallback } from 'react';
import { Image, View, ActivityIndicator, StyleSheet, ImageProps } from 'react-native';

import { theme } from '../../theme';

export interface LazyImageProps {
  uri: string;
  width?: number;
  height?: number;
  borderRadius?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  style?: ImageProps['style'];
  testID?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  uri,
  width = 200,
  height = 200,
  borderRadius,
  onLoad,
  onError,
  style,
  testID,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    setError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setError(true);
    setLoaded(false);
    onError?.(new Error(`Failed to load image: ${uri}`));
  }, [onError, uri]);

  const containerStyle = [
    styles.container,
    { width, height },
    borderRadius !== undefined && { borderRadius },
  ];

  return (
    <View style={containerStyle} testID={testID}>
      {!loaded && !error && (
        <View style={[styles.placeholder, { width, height, borderRadius }]}>
          <ActivityIndicator size="small" color={theme.colors.textSecondary} />
        </View>
      )}

      {error && (
        <View
          style={[styles.placeholder, styles.errorPlaceholder, { width, height, borderRadius }]}
        >
          <View style={styles.errorIcon}>
            <View style={styles.errorDot} />
          </View>
        </View>
      )}

      <Image
        source={{ uri }}
        onLoad={handleLoad}
        onError={handleError}
        style={[
          styles.image,
          { width, height },
          borderRadius !== undefined && { borderRadius },
          !loaded && styles.hiddenImage,
          style,
        ]}
        accessibilityRole="image"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorPlaceholder: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  errorIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorDot: {
    width: 8,
    height: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.error,
  },
  image: {
    resizeMode: 'cover',
  },
  hiddenImage: {
    opacity: 0,
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

export default LazyImage;
