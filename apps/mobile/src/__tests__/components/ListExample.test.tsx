import React from 'react';
import { render, fireEvent } from '../utils/test-utils';
import { ItemList } from '../../components/ItemList';

describe('ItemList (List Component Example)', () => {
  const mockItems: Item[] = [
    { id: '1', title: 'Item 1', description: 'Description 1' },
    { id: '2', title: 'Item 2', description: 'Description 2' },
    { id: '3', title: 'Item 3', description: 'Description 3' },
  ];

  const mockOnItemPress = jest.fn();

  beforeEach(() => {
    mockOnItemPress.mockClear();
  });

  it('renders list with items', () => {
    const { getByTestId, getByText } = render(
      <ItemList items={mockItems} />
    );

    expect(getByTestId('item-list')).toBeTruthy();

    mockItems.forEach((item) => {
      expect(getByTestId(`item-${item.id}`)).toBeTruthy();
      expect(getByText(item.title)).toBeTruthy();
      expect(getByText(item.description)).toBeTruthy();
    });
  });

  it('handles item press', () => {
    const { getByTestId } = render(
      <ItemList items={mockItems} onItemPress={mockOnItemPress} />
    );

    fireEvent.press(getByTestId('item-1'));

    expect(mockOnItemPress).toHaveBeenCalledWith(mockItems[0]);
  });

  it('shows empty state when no items', () => {
    const { getByTestId, queryByTestId } = render(<ItemList items={[]} />);

    expect(queryByTestId('item-list')).toBeNull();
    expect(getByTestId('empty-state')).toBeTruthy();
    expect(getByTestId('empty-message').props.children).toBe('No items found');
  });

  it('shows custom empty message', () => {
    const customMessage = 'Custom empty message';
    const { getByTestId } = render(
      <ItemList items={[]} emptyMessage={customMessage} />
    );

    expect(getByTestId('empty-message').props.children).toBe(customMessage);
  });

  it('renders correct item content', () => {
    const { getByTestId } = render(<ItemList items={mockItems} />);

    mockItems.forEach((item) => {
      const itemElement = getByTestId(`item-${item.id}`);

      expect(itemElement).toBeTruthy();
      expect(getByTestId(`item-title-${item.id}`).props.children).toBe(item.title);
      expect(getByTestId(`item-description-${item.id}`).props.children).toBe(item.description);
    });
  });
});
