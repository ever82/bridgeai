import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { Icon } from '../Icon/Icon';
import { theme } from '../../theme';

const IconStory = () => {
  const iconSizes = [16, 24, 32, 48];
  const iconColors = [
    theme.colors.text,
    theme.colors.primary,
    theme.colors.success,
    theme.colors.warning,
    theme.colors.error,
  ];

  const navigationIcons = ['home', 'back', 'forward', 'menu', 'close', 'search', 'settings'];
  const actionIcons = ['add', 'edit', 'delete', 'check', 'clear', 'refresh', 'share'];
  const statusIcons = ['success', 'warning', 'error', 'info', 'loading'];
  const contentIcons = ['user', 'email', 'phone', 'lock', 'star', 'heart', 'bookmark'];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Icon Component</Text>

      <Text style={styles.sectionTitle}>Sizes</Text>
      <View style={styles.row}>
        {iconSizes.map((size) => (
          <View key={size} style={styles.iconItem}>
            <Icon name="star" size={size} />
            <Text style={styles.iconLabel}>{size}px</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Colors</Text>
      <View style={styles.row}>
        {iconColors.map((color, index) => (
          <View key={index} style={styles.iconItem}>
            <Icon name="star" size={24} color={color} />
            <Text style={styles.iconLabel}>{index === 0 ? 'default' : `color-${index}`}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Navigation Icons</Text>
      <View style={styles.row}>
        {navigationIcons.map((name) => (
          <View key={name} style={styles.iconItem}>
            <Icon name={name as any} size={24} />
            <Text style={styles.iconLabel}>{name}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Action Icons</Text>
      <View style={styles.row}>
        {actionIcons.map((name) => (
          <View key={name} style={styles.iconItem}>
            <Icon name={name as any} size={24} />
            <Text style={styles.iconLabel}>{name}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Status Icons</Text>
      <View style={styles.row}>
        {statusIcons.map((name) => (
          <View key={name} style={styles.iconItem}>
            <Icon name={name as any} size={24} color={
              name === 'success' ? theme.colors.success :
              name === 'warning' ? theme.colors.warning :
              name === 'error' ? theme.colors.error :
              name === 'info' ? theme.colors.info :
              theme.colors.text
            } />
            <Text style={styles.iconLabel}>{name}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Content Icons</Text>
      <View style={styles.row}>
        {contentIcons.map((name) => (
          <View key={name} style={styles.iconItem}>
            <Icon name={name as any} size={24} />
            <Text style={styles.iconLabel}>{name}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.base,
  },
  title: {
    fontSize: theme.fonts.sizes.xl,
    fontWeight: theme.fonts.weights.bold,
    marginBottom: theme.spacing.lg,
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.base,
    color: theme.colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.base,
  },
  iconItem: {
    alignItems: 'center',
    marginBottom: theme.spacing.base,
  },
  iconLabel: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
});

export default IconStory;
