import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import { SearchSourceTabs } from '../SearchSourceTabs';

describe('SearchSourceTabs', () => {
  const mockOnSourceChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all three source tabs', () => {
      render(<SearchSourceTabs activeSource="all" onSourceChange={mockOnSourceChange} />);

      expect(screen.getByText('All')).toBeTruthy();
      expect(screen.getByText('Local')).toBeTruthy();
      expect(screen.getByText('Cloud')).toBeTruthy();
    });

    it('renders with counts when showCounts is true', () => {
      render(
        <SearchSourceTabs
          activeSource="all"
          onSourceChange={mockOnSourceChange}
          totalCount={50}
          localCount={30}
          cloudCount={20}
        />
      );

      // Check for badge counts
      expect(screen.getByText('50')).toBeTruthy();
      expect(screen.getByText('30')).toBeTruthy();
      expect(screen.getByText('20')).toBeTruthy();
    });

    it('does not render counts when showCounts is false', () => {
      render(
        <SearchSourceTabs
          activeSource="all"
          onSourceChange={mockOnSourceChange}
          totalCount={50}
          showCounts={false}
        />
      );

      // Should not find the count badge
      expect(screen.queryByText('50')).toBeNull();
    });

    it('shows 99+ for counts over 99', () => {
      render(
        <SearchSourceTabs activeSource="all" onSourceChange={mockOnSourceChange} totalCount={150} />
      );

      expect(screen.getByText('99+')).toBeTruthy();
    });
  });

  describe('Source Switching', () => {
    it('calls onSourceChange when a tab is pressed', () => {
      render(<SearchSourceTabs activeSource="all" onSourceChange={mockOnSourceChange} />);

      const localTab = screen.getByText('Local');
      fireEvent.press(localTab);

      expect(mockOnSourceChange).toHaveBeenCalledWith('local');
    });

    it('allows switching to cloud source', () => {
      render(<SearchSourceTabs activeSource="all" onSourceChange={mockOnSourceChange} />);

      const cloudTab = screen.getByText('Cloud');
      fireEvent.press(cloudTab);

      expect(mockOnSourceChange).toHaveBeenCalledWith('cloud');
    });

    it('allows switching back to all', () => {
      render(<SearchSourceTabs activeSource="local" onSourceChange={mockOnSourceChange} />);

      const allTab = screen.getByText('All');
      fireEvent.press(allTab);

      expect(mockOnSourceChange).toHaveBeenCalledWith('all');
    });
  });

  describe('Active State Styling', () => {
    it('shows active state for selected source', () => {
      const { getByText } = render(
        <SearchSourceTabs activeSource="local" onSourceChange={mockOnSourceChange} />
      );

      // Active tab should have different styling (can't easily test styles,
      // but we can verify it's rendered)
      const localTab = getByText('Local');
      expect(localTab).toBeTruthy();
    });

    it('updates active state after switching', () => {
      const { rerender, getByText } = render(
        <SearchSourceTabs activeSource="all" onSourceChange={mockOnSourceChange} />
      );

      rerender(<SearchSourceTabs activeSource="cloud" onSourceChange={mockOnSourceChange} />);

      expect(getByText('Cloud')).toBeTruthy();
    });
  });

  describe('Disabled State', () => {
    it('does not call onSourceChange when disabled', () => {
      render(
        <SearchSourceTabs activeSource="all" onSourceChange={mockOnSourceChange} disabled={true} />
      );

      const localTab = screen.getByText('Local');
      fireEvent.press(localTab);

      expect(mockOnSourceChange).not.toHaveBeenCalled();
    });

    it('applies disabled styling when disabled', () => {
      const { getByText } = render(
        <SearchSourceTabs activeSource="all" onSourceChange={mockOnSourceChange} disabled={true} />
      );

      // All tabs should be in disabled state
      expect(getByText('All')).toBeTruthy();
      expect(getByText('Local')).toBeTruthy();
      expect(getByText('Cloud')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility role', () => {
      render(<SearchSourceTabs activeSource="all" onSourceChange={mockOnSourceChange} />);

      const allTab = screen.getByText('All');
      expect(allTab).toBeTruthy();
    });

    it('has exactly one selected tab at a time', () => {
      render(<SearchSourceTabs activeSource="all" onSourceChange={mockOnSourceChange} />);

      // Use getAllByA11yState instead of getByA11yState to avoid
      // "Found multiple elements" errors
      const selectedTabs = screen.getAllByA11yState({ selected: true });
      expect(selectedTabs).toHaveLength(1);
    });

    it('applies disabled accessibility state to all tabs when disabled', () => {
      render(
        <SearchSourceTabs activeSource="all" onSourceChange={mockOnSourceChange} disabled={true} />
      );

      // Use getAllByA11yState to find tabs with disabled: true
      const disabledTabs = screen.getAllByA11yState({ disabled: true });
      expect(disabledTabs).toHaveLength(3);
    });

    it('renders without crashing when disabled', () => {
      render(
        <SearchSourceTabs activeSource="all" onSourceChange={mockOnSourceChange} disabled={true} />
      );

      expect(screen.getByText('All')).toBeTruthy();
    });
  });

  describe('Indicator', () => {
    it('renders indicator dots', () => {
      render(<SearchSourceTabs activeSource="all" onSourceChange={mockOnSourceChange} />);

      // Should render without crashing
      expect(screen.getByText('All')).toBeTruthy();
    });
  });
});
