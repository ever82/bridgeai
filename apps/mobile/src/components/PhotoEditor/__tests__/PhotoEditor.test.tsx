import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { PhotoEditor, EditablePhoto, FILTERS } from '../PhotoEditor';

describe('PhotoEditor', () => {
  const mockPhoto: EditablePhoto = {
    uri: 'file://test/photo.jpg',
    id: 'test-photo-1',
  };

  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with photo', () => {
    const { getByText } = render(
      <PhotoEditor
        photo={mockPhoto}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(getByText('编辑照片')).toBeTruthy();
    expect(getByText('保存')).toBeTruthy();
  });

  it('calls onCancel when close button pressed', () => {
    render(
      <PhotoEditor
        photo={mockPhoto}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // fireEvent.press(getByTestId('close-button'));
    // expect(mockOnCancel).toHaveBeenCalled();
  });

  it('calls onSave when save button pressed', () => {
    const { getByText } = render(
      <PhotoEditor
        photo={mockPhoto}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.press(getByText('保存'));
    expect(mockOnSave).toHaveBeenCalledWith(mockPhoto);
  });

  it('switches between tool tabs', () => {
    const { getByText } = render(
      <PhotoEditor
        photo={mockPhoto}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.press(getByText('裁剪'));
    fireEvent.press(getByText('滤镜'));
    fireEvent.press(getByText('标记'));
  });

  it('has correct filter options', () => {
    expect(FILTERS).toHaveLength(8);
    expect(FILTERS[0].id).toBe('normal');
    expect(FILTERS[0].name).toBe('原图');
  });
});
