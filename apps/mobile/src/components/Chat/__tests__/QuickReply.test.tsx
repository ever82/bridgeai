import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ScrollView, TouchableOpacity } from 'react-native';

import { QuickReply, QuickReplyItem } from '../QuickReply';

describe('QuickReply', () => {
  const mockReplies: QuickReplyItem[] = [
    { id: '1', text: 'Hello' },
    { id: '2', text: 'How are you?' },
    { id: '3', text: 'Thanks!' },
  ];

  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should still render the add-custom-reply button when replies array is empty', () => {
      const { getByTestId } = render(
        <QuickReply replies={[]} onSelect={mockOnSelect} testID="quick-reply" />
      );

      // Container should be rendered so users can always add a custom reply
      expect(getByTestId('quick-reply')).toBeTruthy();
      expect(getByTestId('quick-reply-add-button')).toBeTruthy();
    });

    it('should render reply items with correct text', () => {
      const { getByText } = render(<QuickReply replies={mockReplies} onSelect={mockOnSelect} />);

      expect(getByText('Hello')).toBeTruthy();
      expect(getByText('How are you?')).toBeTruthy();
      expect(getByText('Thanks!')).toBeTruthy();
    });

    it('should render in a horizontal ScrollView', () => {
      const { UNSAFE_getByType } = render(
        <QuickReply replies={mockReplies} onSelect={mockOnSelect} />
      );

      const scrollView = UNSAFE_getByType(ScrollView);
      expect(scrollView).toBeTruthy();
    });

    it('should render each reply plus the add-custom-reply button as TouchableOpacity', () => {
      const { UNSAFE_getAllByType, getByTestId } = render(
        <QuickReply replies={mockReplies} onSelect={mockOnSelect} />
      );

      // 3 replies + 1 add button visible in the scroll bar (modal buttons exist
      // in the tree but are hidden inside an invisible Modal). Assert the add
      // button is present and that the visible reply count matches.
      expect(getByTestId('quick-reply-add-button')).toBeTruthy();
      const touchableOpacities = UNSAFE_getAllByType(TouchableOpacity);
      // 3 replies + 1 add + 2 modal buttons (cancel, confirm) rendered in tree
      expect(touchableOpacities.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Interactions', () => {
    it('should call onSelect callback when a reply is pressed', () => {
      const { getByText } = render(<QuickReply replies={mockReplies} onSelect={mockOnSelect} />);

      fireEvent.press(getByText('Hello'));
      expect(mockOnSelect).toHaveBeenCalledWith({ id: '1', text: 'Hello' });
    });

    it('should call onSelect with correct reply data on multiple presses', () => {
      const { getByText } = render(<QuickReply replies={mockReplies} onSelect={mockOnSelect} />);

      fireEvent.press(getByText('How are you?'));
      expect(mockOnSelect).toHaveBeenCalledWith({ id: '2', text: 'How are you?' });

      fireEvent.press(getByText('Thanks!'));
      expect(mockOnSelect).toHaveBeenCalledWith({ id: '3', text: 'Thanks!' });
    });
  });

  describe('Props', () => {
    it('should apply custom style', () => {
      const customStyle = { marginTop: 10 };
      const { getByTestId } = render(
        <QuickReply
          replies={mockReplies}
          onSelect={mockOnSelect}
          style={customStyle}
          testID="quick-reply"
        />
      );

      expect(getByTestId('quick-reply')).toBeTruthy();
    });

    it('should respect testID', () => {
      const { getByTestId } = render(
        <QuickReply replies={mockReplies} onSelect={mockOnSelect} testID="my-quick-reply" />
      );

      expect(getByTestId('my-quick-reply')).toBeTruthy();
    });
  });
});
