import React from 'react';

import { render } from '../utils/test-utils';
import { Button } from '../../components/Button';
import { LoginForm } from '../../components/LoginForm';
import { ItemList } from '../../components/ItemList';

describe('Component Snapshots', () => {
  describe('Button', () => {
    it('matches primary variant snapshot', () => {
      const { toJSON } = render(<Button title="Primary Button" onPress={jest.fn()} variant="primary" />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches secondary variant snapshot', () => {
      const { toJSON } = render(<Button title="Secondary Button" onPress={jest.fn()} variant="secondary" />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches outline variant snapshot', () => {
      const { toJSON } = render(<Button title="Outline Button" onPress={jest.fn()} variant="outline" />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches ghost variant snapshot', () => {
      const { toJSON } = render(<Button title="Ghost Button" onPress={jest.fn()} variant="ghost" />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches loading state snapshot', () => {
      const { toJSON } = render(<Button title="Loading Button" onPress={jest.fn()} loading />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches disabled state snapshot', () => {
      const { toJSON } = render(<Button title="Disabled Button" onPress={jest.fn()} disabled />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches different sizes snapshot', () => {
      const { toJSON: sm } = render(<Button title="Small" onPress={jest.fn()} size="sm" />);
      const { toJSON: md } = render(<Button title="Medium" onPress={jest.fn()} size="md" />);
      const { toJSON: lg } = render(<Button title="Large" onPress={jest.fn()} size="lg" />);

      expect(sm()).toMatchSnapshot('small button');
      expect(md()).toMatchSnapshot('medium button');
      expect(lg()).toMatchSnapshot('large button');
    });
  });

  describe('LoginForm', () => {
    it('matches initial state snapshot', () => {
      const { toJSON } = render(<LoginForm onSubmit={jest.fn()} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches loading state snapshot', () => {
      const { toJSON } = render(<LoginForm onSubmit={jest.fn()} loading />);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  describe('ItemList', () => {
    const mockItems = [
      { id: '1', title: 'Item 1', description: 'Description 1' },
      { id: '2', title: 'Item 2', description: 'Description 2' },
    ];

    it('matches list with items snapshot', () => {
      const { toJSON } = render(<ItemList items={mockItems} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches empty list snapshot', () => {
      const { toJSON } = render(<ItemList items={[]} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('matches custom empty message snapshot', () => {
      const { toJSON } = render(<ItemList items={[]} emptyMessage="Custom empty message" />);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
