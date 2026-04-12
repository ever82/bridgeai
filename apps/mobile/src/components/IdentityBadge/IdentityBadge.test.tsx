import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { IdentityBadge } from './IdentityBadge';
import { theme } from '../../theme';

describe('IdentityBadge', () => {
  it('renders agent badge', () => {
    render(<IdentityBadge type="agent" testID="badge" />);
    expect(screen.getByTestId('badge')).toBeTruthy();
    expect(screen.getByLabelText('Agent徽章')).toBeTruthy();
  });

  it('renders verified badge', () => {
    render(<IdentityBadge type="verified" testID="badge" />);
    expect(screen.getByTestId('badge')).toBeTruthy();
    expect(screen.getByLabelText('已认证徽章')).toBeTruthy();
  });

  it('renders scene badges', () => {
    const sceneTypes: Array<'scene-vision' | 'scene-date' | 'scene-job' | 'scene-ad'> = [
      'scene-vision',
      'scene-date',
      'scene-job',
      'scene-ad',
    ];
    sceneTypes.forEach((type) => {
      const { rerender } = render(<IdentityBadge type={type} testID="badge" />);
      expect(screen.getByTestId('badge')).toBeTruthy();
      rerender(<></>);
    });
  });

  it('renders with different sizes', () => {
    const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];
    sizes.forEach((size) => {
      const { rerender } = render(<IdentityBadge type="agent" size={size} testID="badge" />);
      expect(screen.getByTestId('badge')).toBeTruthy();
      rerender(<></>);
    });
  });

  it('renders with label when showLabel is true', () => {
    render(<IdentityBadge type="agent" showLabel testID="badge" />);
    expect(screen.getByText('Agent')).toBeTruthy();
  });

  it('hides label when showLabel is false', () => {
    render(<IdentityBadge type="agent" showLabel={false} testID="badge" />);
    expect(screen.queryByText('Agent')).toBeNull();
  });

  it('renders with different positions', () => {
    const positions: Array<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'beside-name'> = [
      'bottom-right',
      'bottom-left',
      'top-right',
      'top-left',
      'beside-name',
    ];
    positions.forEach((position) => {
      const { rerender } = render(
        <IdentityBadge type="agent" position={position} testID="badge" />
      );
      expect(screen.getByTestId('badge')).toBeTruthy();
      rerender(<></>);
    });
  });

  it('applies border for scene badges', () => {
    render(<IdentityBadge type="scene-vision" testID="badge" />);
    const badge = screen.getByTestId('badge');
    expect(badge.props.style).toMatchObject({
      borderWidth: 1,
      borderColor: theme.colors.primary,
    });
  });

  it('applies custom style prop', () => {
    const customStyle = { marginTop: 10 };
    render(<IdentityBadge type="agent" style={customStyle} testID="badge" />);
    const badge = screen.getByTestId('badge');
    expect(badge.props.style).toMatchObject(customStyle);
  });
});
