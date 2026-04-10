import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Card } from './Card';

describe('Card', () => {
  it('renders correctly with default props', () => {
    render(
      <Card>
        <span>Card content</span>
      </Card>
    );
    expect(screen.getByText('Card content')).toBeTruthy();
  });

  it('renders with title', () => {
    render(
      <Card title="Card Title">
        <span>Content</span>
      </Card>
    );
    expect(screen.getByText('Card Title')).toBeTruthy();
  });

  it('renders with subtitle', () => {
    render(
      <Card title="Card Title" subtitle="Card Subtitle">
        <span>Content</span>
      </Card>
    );
    expect(screen.getByText('Card Subtitle')).toBeTruthy();
  });

  it('renders with custom header', () => {
    render(
      <Card header={<span testID="custom-header">Custom Header</span>}>
        <span>Content</span>
      </Card>
    );
    expect(screen.getByTestId('custom-header')).toBeTruthy();
  });

  it('renders with custom footer', () => {
    render(
      <Card footer={<span testID="custom-footer">Custom Footer</span>}>
        <span>Content</span>
      </Card>
    );
    expect(screen.getByTestId('custom-footer')).toBeTruthy();
  });

  it('is pressable when onPress is provided', () => {
    const mockOnPress = jest.fn();
    render(
      <Card onPress={mockOnPress}>
        <span>Pressable Card</span>
      </Card>
    );
    fireEvent.press(screen.getByRole('button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('is pressable when pressable prop is true', () => {
    const mockOnPress = jest.fn();
    render(
      <Card pressable onPress={mockOnPress}>
        <span>Pressable Card</span>
      </Card>
    );
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('renders elevated variant', () => {
    render(
      <Card variant="elevated">
        <span>Elevated Card</span>
      </Card>
    );
    expect(screen.getByText('Elevated Card')).toBeTruthy();
  });

  it('renders outlined variant', () => {
    render(
      <Card variant="outlined">
        <span>Outlined Card</span>
      </Card>
    );
    expect(screen.getByText('Outlined Card')).toBeTruthy();
  });

  it('renders with small padding', () => {
    render(
      <Card padding="sm">
        <span>Small Padding</span>
      </Card>
    );
    expect(screen.getByText('Small Padding')).toBeTruthy();
  });

  it('renders with large padding', () => {
    render(
      <Card padding="lg">
        <span>Large Padding</span>
      </Card>
    );
    expect(screen.getByText('Large Padding')).toBeTruthy();
  });

  it('renders with no padding', () => {
    render(
      <Card padding="none">
        <span>No Padding</span>
      </Card>
    );
    expect(screen.getByText('No Padding')).toBeTruthy();
  });
});
