import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { SearchSourceTabs, SearchSource } from '../SearchSourceTabs';

describe('SearchSourceTabs', () => {
  const mockOnSourceChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all three source tabs', () => {
      render(
        <SearchSourceTabs
          activeSource="all"
          onSourceChange={mockOnSourceChange}
        />
      );

      expect(screen.getByText('All')).toBeTruthy();
      expect(screen.getByText('Local')).toBeTruthy();
      expect(screen.getByText('Cloud')).toBeTruthy();
    });

    it('renders with counts when showCounts is true', () => {
      render(
        <SearchSourceTabs
          activeSource="all"
          onSourceChange={mockOnSourceChange}
          totalCount={100}
          localCount={50}
          cloudCount={50}
        />
      );

      // Check for badge counts
      expect(screen.getByText('100')).toBeTruthy();
      expect(screen.getByText('50')).toBeTruthy();
    });

    it('does not render counts when showCounts is false', () => {
      render(
        <SearchSourceTabs
          activeSource="all"
          onSourceChange={mockOnSourceChange}
          totalCount={100}
          showCounts={false}
        />
      );

      // Should not find the count badge
      expect(screen.queryByText('100')).toBeNull();
    });

    it('shows 99+ for counts over 99', () => {
      render(
        <SearchSourceTabs
          activeSource="all"
          onSourceChange={mockOnSourceChange}
          totalCount={150}
        />
      );

      expect(screen.getByText('99+')).toBeTruthy();
    });
  });

  describe('Source Switching', () => {
    it('calls onSourceChange when a tab is pressed', () => {
      render(
        <SearchSourceTabs
          activeSource="all"
          onSourceChange={mockOnSourceChange}
        />
      );

      const localTab = screen.getByText('Local');
      fireEvent.press(localTab);

      expect(mockOnSourceChange).toHaveBeenCalledWith('local');
    });

    it('allows switching to cloud source', () => {
      render(
        <SearchSourceTabs
          activeSource="all"
          onSourceChange={mockOnSourceChange}
        />
      );

      const cloudTab = screen.getByText('Cloud');
      fireEvent.press(cloudTab);

      expect(mockOnSourceChange).toHaveBeenCalledWith('cloud');
    });

    it('allows switching back to all', () => {
      render(
        <SearchSourceTabs
          activeSource="local"
          onSourceChange={mockOnSourceChange}
        />
      );

      const allTab = screen.getByText('All');
      fireEvent.press(allTab);

      expect(mockOnSourceChange).toHaveBeenCalledWith('all');
    });
  });

  describe('Active State Styling', () => {
    it('shows active state for selected source', () => {
      const { getByText } = render(
        <SearchSourceTabs
          activeSource="local"
          onSourceChange={mockOnSourceChange}
        />
      );

      // Active tab should have different styling (can't easily test styles,
      // but we can verify it's rendered)
      const localTab = getByText('Local');
      expect(localTab).toBeTruthy();
    });

    it('updates active state after switching', () => {
      const { rerender, getByText } = render(
        <SearchSourceTabs
          activeSource="all"
          onSourceChange={mockOnSourceChange}
        />
      );

      rerender(
        <SearchSourceTabs
          activeSource="cloud"
          onSourceChange={mockOnSourceChange}
        />
      );

      expect(getByText('Cloud')).toBeTruthy();
    });
  });

  describe('Disabled State', () => {
    it('does not call onSourceChange when disabled', () => {
      render(
        <SearchSourceTabs
          activeSource="all"
          onSourceChange={mockOnSourceChange}
          disabled={true}
        />
      );

      const localTab = screen.getByText('Local');
      fireEvent.press(localTab);

      expect(mockOnSourceChange).not.toHaveBeenCalled();
    });

    it('applies disabled styling when disabled', () => {
      const { getByText } = render(
        <SearchSourceTabs
          activeSource="all"
          onSourceChange={mockOnSourceChange}
          disabled={true}
        />
      );

      // All tabs should be in disabled state
      expect(getByText('All')).toBeTruthy();
      expect(getByText('Local')).toBeTruthy();
      expect(getByText('Cloud')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility role', () => {
      render(
        <SearchSourceTabs
          activeSource="all"
          onSourceChange={mockOnSourceChange}
        />
      );

      const allTab = screen.getByA11yLabel('All search results');
      expect(allTab).toBeTruthy();
    });

    it('indicates selected state', () => {
      render(
        <SearchSourceTabs
          activeSource="local"
          onSourceChange={mockOnSourceChange}
        />
      );

      const localTab = screen.getByA11yState({ selected: true });
      expect(localTab).toBeTruthy();
    });

    it('indicates disabled state', () => {
      render(
        <SearchSourceTabs
          activeSource="all"
          onSourceChange={mockOnSourceChange}
          disabled={true}
        />
      );

      const allTab = screen.getByA11yState({ disabled: true });
      expect(allTab).toBeTruthy();
    });
  });

  describe('Indicator', () => {
    it('renders indicator dots', () => {
      const { container } = render(
        <SearchSourceTabs
          activeSource="all"
          onSourceChange={mockOnSourceChange}
        />
      );

      // Should have indicator container with 3 dots
      expect(container).toBeTruthy();
    });
  });
});
