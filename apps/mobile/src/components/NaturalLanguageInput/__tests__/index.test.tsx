/**
 * NaturalLanguageInput Component Tests
 * L3自然语言输入组件测试
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import { NaturalLanguageInput } from '../index';

// Mock the AI extraction hook
const mockExtractFromText = jest.fn();
jest.mock('../../../hooks/useAIExtraction', () => ({
  useAIExtraction: () => ({
    extractFromText: mockExtractFromText,
    isLoading: false,
    error: null,
    lastResult: null,
    clearResult: jest.fn(),
  }),
}));

// Mock the theme hook
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        text: '#000000',
        textSecondary: '#666666',
        surface: '#FFFFFF',
        background: '#F5F5F5',
        border: '#E0E0E0',
        primary: '#2196F3',
        disabled: '#BDBDBD',
      },
    },
  }),
}));

describe('NaturalLanguageInput', () => {
  const mockOnConfirm = jest.fn();
  const mockOnEdit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render text input with placeholder', () => {
    const { getByPlaceholderText } = render(
      <NaturalLanguageInput
        scene="visionshare"
        onConfirm={mockOnConfirm}
        placeholder="用自然语言描述..."
      />
    );

    expect(getByPlaceholderText('用自然语言描述...')).toBeTruthy();
  });

  it('should update text when user types', () => {
    const { getByPlaceholderText } = render(
      <NaturalLanguageInput
        scene="visionshare"
        onConfirm={mockOnConfirm}
      />
    );

    const input = getByPlaceholderText(/用自然语言描述您的需求/);
    fireEvent.changeText(input, '我想找一位摄影师');

    expect(input.props.value).toBe('我想找一位摄影师');
  });

  it('should show error for text shorter than 10 characters', () => {
    const { getByText, getByPlaceholderText } = render(
      <NaturalLanguageInput
        scene="visionshare"
        onConfirm={mockOnConfirm}
      />
    );

    const input = getByPlaceholderText(/用自然语言描述您的需求/);
    fireEvent.changeText(input, '短文本');

    // Find and press the extract button
    const extractButton = getByText('AI智能提取');
    fireEvent.press(extractButton);

    expect(getByText(/至少10个字符/)).toBeTruthy();
  });

  it('should call extractFromText when text is long enough', async () => {
    mockExtractFromText.mockResolvedValue({
      success: true,
      data: { photographyType: '人像摄影', budget: { min: 1500, max: 2000 } },
      confidence: 85,
      fieldsExtracted: ['photographyType', 'budget'],
      fieldsFailed: [],
      provider: 'openai',
      model: 'gpt-4',
      latencyMs: 1500,
    });

    const { getByText, getByPlaceholderText } = render(
      <NaturalLanguageInput
        scene="visionshare"
        onConfirm={mockOnConfirm}
      />
    );

    const input = getByPlaceholderText(/用自然语言描述您的需求/);
    fireEvent.changeText(input, '我想找一位周末有时间的摄影师，预算2000元');

    const extractButton = getByText('AI智能提取');
    fireEvent.press(extractButton);

    await waitFor(() => {
      expect(mockExtractFromText).toHaveBeenCalledWith(
        '我想找一位周末有时间的摄影师，预算2000元',
        'visionshare',
        expect.objectContaining({
          requireClarification: true,
          extractEntities: true,
        })
      );
    });
  });

  it('should show extraction preview after successful extraction', async () => {
    mockExtractFromText.mockResolvedValue({
      success: true,
      data: { photographyType: '人像摄影', budget: { min: 1500, max: 2000 } },
      confidence: 85,
      fieldsExtracted: ['photographyType', 'budget'],
      fieldsFailed: [],
      provider: 'openai',
      model: 'gpt-4',
      latencyMs: 1500,
    });

    const { getByText, getByPlaceholderText } = render(
      <NaturalLanguageInput
        scene="visionshare"
        onConfirm={mockOnConfirm}
      />
    );

    const input = getByPlaceholderText(/用自然语言描述您的需求/);
    fireEvent.changeText(input, '我想找一位周末有时间的摄影师，预算2000元');

    const extractButton = getByText('AI智能提取');
    fireEvent.press(extractButton);

    await waitFor(() => {
      expect(getByText('提取结果预览')).toBeTruthy();
      expect(getByText('确认')).toBeTruthy();
      expect(getByText('取消')).toBeTruthy();
    });
  });

  it('should call onConfirm when user confirms extraction', async () => {
    const extractedData = {
      photographyType: '人像摄影',
      budget: { min: 1500, max: 2000 },
    };

    mockExtractFromText.mockResolvedValue({
      success: true,
      data: extractedData,
      confidence: 85,
      fieldsExtracted: ['photographyType', 'budget'],
      fieldsFailed: [],
      provider: 'openai',
      model: 'gpt-4',
      latencyMs: 1500,
    });

    const { getByText, getByPlaceholderText } = render(
      <NaturalLanguageInput
        scene="visionshare"
        onConfirm={mockOnConfirm}
      />
    );

    const input = getByPlaceholderText(/用自然语言描述您的需求/);
    fireEvent.changeText(input, '我想找一位周末有时间的摄影师，预算2000元');

    const extractButton = getByText('AI智能提取');
    fireEvent.press(extractButton);

    await waitFor(() => {
      expect(getByText('确认')).toBeTruthy();
    });

    fireEvent.press(getByText('确认'));

    expect(mockOnConfirm).toHaveBeenCalledWith(extractedData, 85);
  });

  it('should clear extraction when cancel is pressed', async () => {
    mockExtractFromText.mockResolvedValue({
      success: true,
      data: { photographyType: '人像摄影' },
      confidence: 85,
      fieldsExtracted: ['photographyType'],
      fieldsFailed: [],
      provider: 'openai',
      model: 'gpt-4',
      latencyMs: 1500,
    });

    const { getByText, getByPlaceholderText, queryByText } = render(
      <NaturalLanguageInput
        scene="visionshare"
        onConfirm={mockOnConfirm}
      />
    );

    const input = getByPlaceholderText(/用自然语言描述您的需求/);
    fireEvent.changeText(input, '我想找一位周末有时间的摄影师，预算2000元');

    fireEvent.press(getByText('AI智能提取'));

    await waitFor(() => {
      expect(getByText('取消')).toBeTruthy();
    });

    fireEvent.press(getByText('取消'));

    // After cancel, the extraction preview should disappear
    await waitFor(() => {
      expect(queryByText('取消')).toBeNull();
      expect(getByText('AI智能提取')).toBeTruthy();
    });
  });

  it('should show character count', () => {
    const { getByText, getByPlaceholderText } = render(
      <NaturalLanguageInput
        scene="visionshare"
        onConfirm={mockOnConfirm}
        maxLength={500}
      />
    );

    const input = getByPlaceholderText(/用自然语言描述您的需求/);
    fireEvent.changeText(input, '测试文本');

    expect(getByText('4/500')).toBeTruthy();
  });

  it('should clear input when clear button is pressed', () => {
    const { getByText, getByPlaceholderText } = render(
      <NaturalLanguageInput
        scene="visionshare"
        onConfirm={mockOnConfirm}
      />
    );

    const input = getByPlaceholderText(/用自然语言描述您的需求/);
    fireEvent.changeText(input, '测试文本');

    fireEvent.press(getByText('清空'));

    expect(input.props.value).toBe('');
  });

  it('should call onEdit when re-edit button is pressed', async () => {
    mockExtractFromText.mockResolvedValue({
      success: true,
      data: { photographyType: '人像摄影' },
      confidence: 85,
      fieldsExtracted: ['photographyType'],
      fieldsFailed: [],
      provider: 'openai',
      model: 'gpt-4',
      latencyMs: 1500,
    });

    const { getByText, getByPlaceholderText } = render(
      <NaturalLanguageInput
        scene="visionshare"
        onConfirm={mockOnConfirm}
        onEdit={mockOnEdit}
      />
    );

    const input = getByPlaceholderText(/用自然语言描述您的需求/);
    fireEvent.changeText(input, '我想找一位周末有时间的摄影师，预算2000元');

    fireEvent.press(getByText('AI智能提取'));

    await waitFor(() => {
      expect(getByText('重新编辑')).toBeTruthy();
    });

    fireEvent.press(getByText('重新编辑'));

    expect(mockOnEdit).toHaveBeenCalled();
  });
});
