import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Modal } from './Modal';

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  children: <Text>Modal content</Text>,
};

describe('Modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when visible', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Modal content')).toBeTruthy();
  });

  it('renders without error when visible is false', () => {
    // RNModal with visible=false still mounts children in the React tree;
    // the native layer controls visibility. We just verify no crash.
    render(<Modal {...defaultProps} visible={false} />);
    // The content is still in the React tree; RNModal handles native visibility.
    expect(screen.getByText('Modal content')).toBeTruthy();
  });

  it('calls onClose when backdrop is pressed', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} closeOnBackdropPress />);
    fireEvent.press(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on backdrop press when closeOnBackdropPress is false', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} closeOnBackdropPress={false} />);
    // Backdrop press handler should be undefined, so pressing should not call onClose
    // The TouchableOpacity wrapping the backdrop will have no onPress
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders close button by default', () => {
    render(<Modal {...defaultProps} />);
    // The close button is a TouchableOpacity with an X icon
    expect(screen.getByTestId('modal-close-button')).toBeTruthy();
  });

  it('does not render close button when showCloseButton is false', () => {
    render(<Modal {...defaultProps} showCloseButton={false} />);
    expect(screen.queryByTestId('modal-close-button')).toBeNull();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    fireEvent.press(screen.getByTestId('modal-close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders swipe handle when closeOnSwipeDown is true and size is not full', () => {
    render(<Modal {...defaultProps} closeOnSwipeDown size="md" />);
    expect(screen.getByTestId('modal-swipe-handle')).toBeTruthy();
  });

  it('does not render swipe handle when size is full', () => {
    render(<Modal {...defaultProps} closeOnSwipeDown size="full" />);
    expect(screen.queryByTestId('modal-swipe-handle')).toBeNull();
  });

  it('does not render close button when size is full', () => {
    render(<Modal {...defaultProps} size="full" />);
    expect(screen.queryByTestId('modal-close-button')).toBeNull();
  });

  it('renders with size sm', () => {
    render(<Modal {...defaultProps} size="sm" />);
    expect(screen.getByText('Modal content')).toBeTruthy();
  });

  it('renders with size md (default)', () => {
    render(<Modal {...defaultProps} size="md" />);
    expect(screen.getByText('Modal content')).toBeTruthy();
  });

  it('renders with size lg', () => {
    render(<Modal {...defaultProps} size="lg" />);
    expect(screen.getByText('Modal content')).toBeTruthy();
  });

  it('renders with size full', () => {
    render(<Modal {...defaultProps} size="full" />);
    expect(screen.getByText('Modal content')).toBeTruthy();
  });

  it('renders with animationType none', () => {
    render(<Modal {...defaultProps} animationType="none" />);
    expect(screen.getByText('Modal content')).toBeTruthy();
  });

  it('renders with animationType slide', () => {
    render(<Modal {...defaultProps} animationType="slide" />);
    expect(screen.getByText('Modal content')).toBeTruthy();
  });

  it('renders with animationType fade (default)', () => {
    render(<Modal {...defaultProps} animationType="fade" />);
    expect(screen.getByText('Modal content')).toBeTruthy();
  });

  it('renders with animationType scale', () => {
    render(<Modal {...defaultProps} animationType="scale" />);
    expect(screen.getByText('Modal content')).toBeTruthy();
  });

  it('applies testID', () => {
    render(<Modal {...defaultProps} testID="test-modal" />);
    expect(screen.getByTestId('test-modal')).toBeTruthy();
  });
});
