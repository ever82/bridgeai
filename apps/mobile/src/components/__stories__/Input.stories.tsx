import React, { useState } from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { Input } from '../Input/Input';
import { Icon } from '../Icon/Icon';
import { theme } from '../../theme';

const InputStory = () => {
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [text3, setText3] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Input Component</Text>

      <Text style={styles.sectionTitle}>Basic</Text>
      <Input
        label="Username"
        placeholder="Enter username"
        value={text1}
        onChangeText={setText1}
      />

      <Text style={styles.sectionTitle}>With Icons</Text>
      <Input
        label="Email"
        placeholder="Enter email"
        value={email}
        onChangeText={setEmail}
        type="email"
        leftIcon={<Icon name="email" size={20} color={theme.colors.textSecondary} />}
      />

      <Text style={styles.sectionTitle}>Password</Text>
      <Input
        label="Password"
        placeholder="Enter password"
        value={password}
        onChangeText={setPassword}
        type="password"
      />

      <Text style={styles.sectionTitle}>With Helper Text</Text>
      <Input
        label="Phone"
        placeholder="Enter phone number"
        value={text2}
        onChangeText={setText2}
        type="phone"
        helperText="We will never share your phone number"
      />

      <Text style={styles.sectionTitle}>Error State</Text>
      <Input
        label="Email"
        placeholder="Enter email"
        value="invalid-email"
        onChangeText={() => {}}
        type="email"
        state="error"
        errorMessage="Please enter a valid email address"
      />

      <Text style={styles.sectionTitle}>With Character Count</Text>
      <Input
        label="Bio"
        placeholder="Tell us about yourself"
        value={text3}
        onChangeText={setText3}
        maxLength={100}
        showCharacterCount
        multiline
        numberOfLines={3}
      />

      <Text style={styles.sectionTitle}>Disabled</Text>
      <Input
        label="Disabled Input"
        value="Cannot edit this"
        onChangeText={() => {}}
        state="disabled"
      />

      <Text style={styles.sectionTitle}>Read Only</Text>
      <Input
        label="Read Only"
        value="Read only value"
        onChangeText={() => {}}
        state="readonly"
      />
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
});

export default InputStory;
