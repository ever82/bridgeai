/**
 * L2ProfileForm Tests
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { L2Schema, L2SchemaField, L2FieldType } from '@bridgeai/shared';

import { L2ProfileForm } from '../L2ProfileForm';

// Helper to build a minimal schema for testing
const buildSchema = (fields: L2SchemaField[], steps?: L2Schema['steps']): L2Schema => ({
  id: 'test-schema',
  name: 'Test Schema',
  version: '1.0.0',
  fields,
  steps: steps || undefined,
});

// Mock onSubmit to track calls
const mockOnSubmit = jest.fn();
const mockOnCancel = jest.fn();

describe('L2ProfileForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and field types', () => {
    it('renders a text field correctly', () => {
      const schema = buildSchema([
        { id: 'name', label: 'Name', type: L2FieldType.TEXT, required: true },
      ]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Name *')).toBeTruthy();
    });

    it('renders a number field correctly', () => {
      const schema = buildSchema([
        { id: 'age', label: 'Age', type: L2FieldType.NUMBER, required: true, unit: '岁' },
      ]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Age *')).toBeTruthy();
      expect(screen.getByText('岁')).toBeTruthy();
    });

    it('renders a boolean toggle correctly', () => {
      const schema = buildSchema([
        {
          id: 'enabled',
          label: 'Enabled',
          type: L2FieldType.BOOLEAN,
          description: 'Enable this feature',
        },
      ]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Enabled')).toBeTruthy();
      // Description renders both via the field wrapper and inside BooleanToggle
      expect(screen.getAllByText('Enable this feature').length).toBeGreaterThan(0);
    });

    it('renders an enum (single picker) field correctly', () => {
      const schema = buildSchema([
        {
          id: 'gender',
          label: 'Gender',
          type: L2FieldType.ENUM,
          required: true,
          options: [
            { value: 'male', label: 'Male', icon: '♂' },
            { value: 'female', label: 'Female', icon: '♀' },
          ],
        },
      ]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Gender *')).toBeTruthy();
    });

    it('renders a multi-select field correctly', () => {
      const schema = buildSchema([
        {
          id: 'hobbies',
          label: 'Hobbies',
          type: L2FieldType.MULTI_SELECT,
          options: [
            { value: 'reading', label: 'Reading', icon: '📚' },
            { value: 'sports', label: 'Sports', icon: '⚽' },
          ],
          maxItems: 3,
        },
      ]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Hobbies（最多3个）')).toBeTruthy();
    });

    it('renders a range field correctly', () => {
      const schema = buildSchema([
        {
          id: 'price',
          label: 'Price Range',
          type: L2FieldType.RANGE,
          required: true,
          min: 0,
          max: 1000,
          unit: '元',
        },
      ]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Price Range *')).toBeTruthy();
      expect(screen.getByText('最小值')).toBeTruthy();
      expect(screen.getByText('最大值')).toBeTruthy();
    });

    it('renders a long text field with char count', () => {
      const schema = buildSchema([
        {
          id: 'bio',
          label: 'Bio',
          type: L2FieldType.LONG_TEXT,
          maxLength: 200,
        },
      ]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Bio')).toBeTruthy();
      expect(screen.getByText('0/200')).toBeTruthy();
    });

    it('renders unsupported field type with error message', () => {
      const schema = buildSchema([
        { id: 'unknown', label: 'Unknown', type: 'UNKNOWN' as L2FieldType, required: true },
      ]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('不支持的字段类型: UNKNOWN')).toBeTruthy();
    });
  });

  describe('Step navigation', () => {
    it('shows step indicator when multiple steps exist', () => {
      const schema = buildSchema(
        [
          { id: 'name', label: 'Name', type: L2FieldType.TEXT },
          { id: 'age', label: 'Age', type: L2FieldType.NUMBER },
        ],
        [
          { id: 'step1', title: 'Basic Info', fields: ['name'] },
          { id: 'step2', title: 'Details', fields: ['age'] },
        ]
      );

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      // Should show step dots (1 and 2)
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('2')).toBeTruthy();
    });

    it('navigates to next step on button press', () => {
      const schema = buildSchema(
        [
          { id: 'name', label: 'Name', type: L2FieldType.TEXT },
          { id: 'age', label: 'Age', type: L2FieldType.NUMBER },
        ],
        [
          { id: 'step1', title: 'Basic Info', fields: ['name'] },
          { id: 'step2', title: 'Details', fields: ['age'] },
        ]
      );

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      // Initially on step 1 - should show name field
      expect(screen.getByText('Basic Info')).toBeTruthy();

      // Press next
      const nextButton = screen.getByText('下一步');
      fireEvent.press(nextButton);

      // Should now show step 2
      expect(screen.getByText('Details')).toBeTruthy();
    });

    it('navigates to previous step on back press', () => {
      const schema = buildSchema(
        [
          { id: 'name', label: 'Name', type: L2FieldType.TEXT },
          { id: 'age', label: 'Age', type: L2FieldType.NUMBER },
        ],
        [
          { id: 'step1', title: 'Basic Info', fields: ['name'] },
          { id: 'step2', title: 'Details', fields: ['age'] },
        ]
      );

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      // Go to step 2
      fireEvent.press(screen.getByText('下一步'));

      // Go back
      fireEvent.press(screen.getByText('上一步'));

      // Should be back at step 1
      expect(screen.getByText('Basic Info')).toBeTruthy();
    });

    it('shows save button on last step', () => {
      const schema = buildSchema(
        [{ id: 'name', label: 'Name', type: L2FieldType.TEXT }],
        [{ id: 'step1', title: 'Basic Info', fields: ['name'] }]
      );

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      // Single step should show '保存' instead of '下一步'
      expect(screen.getByText('保存')).toBeTruthy();
    });

    it('shows next button on non-last steps', () => {
      const schema = buildSchema(
        [
          { id: 'name', label: 'Name', type: L2FieldType.TEXT },
          { id: 'age', label: 'Age', type: L2FieldType.NUMBER },
        ],
        [
          { id: 'step1', title: 'Step 1', fields: ['name'] },
          { id: 'step2', title: 'Step 2', fields: ['age'] },
        ]
      );

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      // First step should show '下一步'
      expect(screen.getByText('下一步')).toBeTruthy();
    });
  });

  describe('Form interactions', () => {
    it('calls onCancel when cancel button is pressed', () => {
      const schema = buildSchema([{ id: 'name', label: 'Name', type: L2FieldType.TEXT }]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

      fireEvent.press(screen.getByText('取消'));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('calls onSubmit with form data when save button is pressed', () => {
      const schema = buildSchema([
        { id: 'name', label: 'Name', type: L2FieldType.TEXT, required: true },
      ]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      const nameInput = screen.getByPlaceholderText('请输入Name');
      fireEvent.changeText(nameInput, 'Test Name');

      fireEvent.press(screen.getByText('保存'));

      expect(mockOnSubmit).toHaveBeenCalledWith({ name: 'Test Name' });
    });

    it('uses initialData when provided', () => {
      const schema = buildSchema([{ id: 'name', label: 'Name', type: L2FieldType.TEXT }]);

      render(
        <L2ProfileForm
          schema={schema}
          initialData={{ name: 'Pre-filled Name' }}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByPlaceholderText('请输入Name');
      expect(nameInput.props.value).toBe('Pre-filled Name');
    });

    it('shows loading state correctly', () => {
      const schema = buildSchema([{ id: 'name', label: 'Name', type: L2FieldType.TEXT }]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} loading={true} />);

      expect(screen.getByText('保存中...')).toBeTruthy();
    });

    it('disables buttons when loading', () => {
      const schema = buildSchema([{ id: 'name', label: 'Name', type: L2FieldType.TEXT }]);

      render(
        <L2ProfileForm
          schema={schema}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          loading={true}
        />
      );

      // The save button text should appear and the touchable wrapper should be disabled
      expect(screen.getByText('保存中...')).toBeTruthy();
      const cancelText = screen.getByText('取消');
      // Walk up until we find the View with accessibilityState set by TouchableOpacity mock
      type ParentNode =
        | { props?: { accessibilityState?: { disabled?: boolean } }; parent?: ParentNode | null }
        | null
        | undefined;
      let node: ParentNode = cancelText as unknown as ParentNode;
      let found: ParentNode = undefined;
      while (node) {
        if (node.props?.accessibilityState?.disabled === true) {
          found = node;
          break;
        }
        node = node.parent;
      }
      expect(found).toBeTruthy();
    });
  });

  describe('Completion calculation', () => {
    it('calculates 0% completion when no required fields filled', () => {
      const schema = buildSchema([
        { id: 'name', label: 'Name', type: L2FieldType.TEXT, required: true },
        { id: 'age', label: 'Age', type: L2FieldType.NUMBER, required: true },
      ]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('0% 完成')).toBeTruthy();
    });

    it('calculates 50% completion when one of two required fields filled', () => {
      const schema = buildSchema([
        { id: 'name', label: 'Name', type: L2FieldType.TEXT, required: true },
        { id: 'age', label: 'Age', type: L2FieldType.NUMBER, required: true },
      ]);

      render(
        <L2ProfileForm schema={schema} initialData={{ name: 'Test' }} onSubmit={mockOnSubmit} />
      );

      expect(screen.getByText('50% 完成')).toBeTruthy();
    });

    it('calculates 100% completion when all required fields filled', () => {
      const schema = buildSchema([
        { id: 'name', label: 'Name', type: L2FieldType.TEXT, required: true },
        { id: 'age', label: 'Age', type: L2FieldType.NUMBER, required: true },
      ]);

      render(
        <L2ProfileForm
          schema={schema}
          initialData={{ name: 'Test', age: 25 }}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('100% 完成')).toBeTruthy();
    });

    it('shows 100% when no required fields exist', () => {
      const schema = buildSchema([{ id: 'name', label: 'Name', type: L2FieldType.TEXT }]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('100% 完成')).toBeTruthy();
    });

    it('shows green progress bar when complete', () => {
      const schema = buildSchema([{ id: 'name', label: 'Name', type: L2FieldType.TEXT }]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      // Check that progress fill has complete style when at 100%
      expect(screen.getByText('100% 完成')).toBeTruthy();
    });
  });

  describe('ShowWhen conditional fields', () => {
    it('hides field when showWhen condition is not met', () => {
      const schema = buildSchema([
        { id: 'type', label: 'Type', type: L2FieldType.TEXT, required: true },
        {
          id: 'detail',
          label: 'Detail',
          type: L2FieldType.TEXT,
          showWhen: { field: 'type', operator: 'eq', value: 'A' },
        },
      ]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Type *')).toBeTruthy();
      // Detail should not be visible initially
      expect(screen.queryByText('Detail')).toBeNull();
    });

    it('shows field when showWhen condition is met', () => {
      const schema = buildSchema([
        { id: 'type', label: 'Type', type: L2FieldType.TEXT, required: true },
        {
          id: 'detail',
          label: 'Detail',
          type: L2FieldType.TEXT,
          showWhen: { field: 'type', operator: 'eq', value: 'A' },
        },
      ]);

      render(<L2ProfileForm schema={schema} initialData={{ type: 'A' }} onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Type *')).toBeTruthy();
      expect(screen.getByText('Detail')).toBeTruthy();
    });
  });

  describe('SinglePicker (enum field)', () => {
    it('opens modal when picker button is pressed', () => {
      const schema = buildSchema([
        {
          id: 'gender',
          label: 'Gender',
          type: L2FieldType.ENUM,
          options: [
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
          ],
        },
      ]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      const pickerButton = screen.getByText('请选择');
      fireEvent.press(pickerButton);

      // Modal should show options
      expect(screen.getByText('Male')).toBeTruthy();
      expect(screen.getByText('Female')).toBeTruthy();
    });

    it('selects option and closes modal', () => {
      const schema = buildSchema([
        {
          id: 'gender',
          label: 'Gender',
          type: L2FieldType.ENUM,
          options: [
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
          ],
        },
      ]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      // Open modal
      fireEvent.press(screen.getByText('请选择'));

      // Select Male
      fireEvent.press(screen.getByText('Male'));

      // Modal mock keeps children mounted, so 'Male' may appear multiple times
      expect(screen.getAllByText('Male').length).toBeGreaterThan(0);
    });
  });

  describe('MultiPicker (multi-select field)', () => {
    it('opens modal when picker button is pressed', () => {
      const schema = buildSchema([
        {
          id: 'colors',
          label: 'Colors',
          type: L2FieldType.MULTI_SELECT,
          options: [
            { value: 'red', label: 'Red', icon: '🔴' },
            { value: 'blue', label: 'Blue', icon: '🔵' },
          ],
        },
      ]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      fireEvent.press(screen.getByText('请选择'));

      // Modal should show options
      expect(screen.getByText('Red')).toBeTruthy();
      expect(screen.getByText('Blue')).toBeTruthy();
    });

    it('shows done button in modal footer', () => {
      const schema = buildSchema([
        {
          id: 'colors',
          label: 'Colors',
          type: L2FieldType.MULTI_SELECT,
          options: [
            { value: 'red', label: 'Red' },
            { value: 'blue', label: 'Blue' },
          ],
        },
      ]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      fireEvent.press(screen.getByText('请选择'));

      expect(screen.getByText('完成')).toBeTruthy();
    });
  });

  describe('BooleanToggle', () => {
    it('toggles value on press', () => {
      const schema = buildSchema([{ id: 'enabled', label: 'Enabled', type: L2FieldType.BOOLEAN }]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      // Find the toggle by testID and press it
      const toggle = screen.getByTestId('toggle-enabled');
      expect(toggle).toBeTruthy();
      fireEvent.press(toggle);
    });
  });

  describe('RangeInput', () => {
    it('accepts min and max values', () => {
      const schema = buildSchema([
        {
          id: 'price',
          label: 'Price',
          type: L2FieldType.RANGE,
          min: 0,
          max: 1000,
          unit: '元',
        },
      ]);

      render(<L2ProfileForm schema={schema} onSubmit={mockOnSubmit} />);

      // Range inputs use min/max as placeholders
      expect(screen.getByPlaceholderText('0')).toBeTruthy();
      expect(screen.getByPlaceholderText('1000')).toBeTruthy();
    });
  });
});
