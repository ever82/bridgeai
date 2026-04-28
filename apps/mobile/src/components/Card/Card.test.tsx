import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Card } from './Card';

describe('Card', () => {
  it('renders correctly with default props', () => {
    render(
      <Card>
        <Text>Card content</Text>
      </Card>
    );
    expect(screen.getByText('Card content')).toBeTruthy();
  });

  it('renders with title', () => {
    render(
      <Card title="Card Title">
        <Text>Content</Text>
      </Card>
    );
    expect(screen.getByText('Card Title')).toBeTruthy();
  });

  it('renders with subtitle', () => {
    render(
      <Card title="Card Title" subtitle="Card Subtitle">
        <Text>Content</Text>
      </Card>
    );
    expect(screen.getByText('Card Subtitle')).toBeTruthy();
  });

  it('renders with custom header', () => {
    render(
      <Card header={<Text testID="custom-header">Custom Header</Text>}>
        <Text>Content</Text>
      </Card>
    );
    expect(screen.getByTestId('custom-header')).toBeTruthy();
  });

  it('renders with custom footer', () => {
    render(
      <Card footer={<Text testID="custom-footer">Custom Footer</Text>}>
        <Text>Content</Text>
      </Card>
    );
    expect(screen.getByTestId('custom-footer')).toBeTruthy();
  });

  it('is pressable when onPress is provided', () => {
    const mockOnPress = jest.fn();
    render(
      <Card onPress={mockOnPress} testID="pressable-card">
        <Text>Pressable Card</Text>
      </Card>
    );
    fireEvent.press(screen.getByTestId('pressable-card'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('is pressable when pressable prop is true', () => {
    render(
      <Card pressable onPress={jest.fn()} testID="pressable-card">
        <Text>Pressable Card</Text>
      </Card>
    );
    const card = screen.getByTestId('pressable-card');
    expect(card.props.role).toBe('button');
  });

  it('renders elevated variant', () => {
    render(
      <Card variant="elevated">
        <Text>Elevated Card</Text>
      </Card>
    );
    expect(screen.getByText('Elevated Card')).toBeTruthy();
  });

  it('renders outlined variant', () => {
    render(
      <Card variant="outlined">
        <Text>Outlined Card</Text>
      </Card>
    );
    expect(screen.getByText('Outlined Card')).toBeTruthy();
  });

  it('renders with small padding', () => {
    render(
      <Card padding="sm">
        <Text>Small Padding</Text>
      </Card>
    );
    expect(screen.getByText('Small Padding')).toBeTruthy();
  });

  it('renders with large padding', () => {
    render(
      <Card padding="lg">
        <Text>Large Padding</Text>
      </Card>
    );
    expect(screen.getByText('Large Padding')).toBeTruthy();
  });

  it('renders with no padding', () => {
    render(
      <Card padding="none">
        <Text>No Padding</Text>
      </Card>
    );
    expect(screen.getByText('No Padding')).toBeTruthy();
  });
});
