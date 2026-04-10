import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import { theme } from '../../theme';

const ButtonStory = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Button Component</Text>

      <Text style={styles.sectionTitle}>Variants</Text>
      <View style={styles.row}>
        <Button title="Primary" onPress={() => {}} variant="primary" />
      </View>
      <View style={styles.row}>
        <Button title="Secondary" onPress={() => {}} variant="secondary" />
      </View>
      <View style={styles.row}>
        <Button title="Outline" onPress={() => {}} variant="outline" />
      </View>
      <View style={styles.row}>
        <Button title="Ghost" onPress={() => {}} variant="ghost" />
      </View>
      <View style={styles.row}>
        <Button title="Text" onPress={() => {}} variant="text" />
      </View>

      <Text style={styles.sectionTitle}>Sizes</Text>
      <View style={styles.row}>
        <Button title="Small" onPress={() => {}} size="sm" />
      </View>
      <View style={styles.row}>
        <Button title="Medium" onPress={() => {}} size="md" />
      </View>
      <View style={styles.row}>
        <Button title="Large" onPress={() => {}} size="lg" />
      </View>

      <Text style={styles.sectionTitle}>States</Text>
      <View style={styles.row}>
        <Button title="Disabled" onPress={() => {}} disabled />
      </View>
      <View style={styles.row}>
        <Button title="Loading" onPress={() => {}} loading />
      </View>

      <Text style={styles.sectionTitle}>With Icons</Text>
      <View style={styles.row}>
        <Button
          title="With Left Icon"
          onPress={() => {}}
          leftIcon={<Icon name="add" size={16} color={theme.colors.textInverse} />}
        />
      </View>
      <View style={styles.row}>
        <Button
          title="With Right Icon"
          onPress={() => {}}
          rightIcon={<Icon name="forward" size={16} color={theme.colors.textInverse} />}
        />
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
    marginBottom: theme.spacing.sm,
  },
});

export default ButtonStory;
