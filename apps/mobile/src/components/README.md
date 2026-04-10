# BridgeAI Design System

This is the BridgeAI Design System - a collection of React Native components that provide a consistent, accessible, and beautiful user interface across the application.

## Table of Contents

- [Getting Started](#getting-started)
- [Design Tokens](#design-tokens)
- [Components](#components)
  - [Button](#button)
  - [Input](#input)
  - [Card](#card)
  - [Modal](#modal)
  - [Icon](#icon)
- [Theming](#theming)
- [Accessibility](#accessibility)

## Getting Started

Import components from the design system:

```typescript
import { Button, Input, Card, Modal, Icon } from './components';
import { theme } from './theme';
```

## Design Tokens

Design tokens are the visual building blocks of the design system, stored in `theme/index.ts`.

### Colors

```typescript
theme.colors.primary      // Primary brand color
theme.colors.secondary    // Secondary brand color
theme.colors.success      // Success state
theme.colors.warning      // Warning state
theme.colors.error        // Error state
theme.colors.info         // Info state
theme.colors.background   // Background color
theme.colors.text         // Primary text color
theme.colors.textSecondary // Secondary text color
```

### Typography

```typescript
theme.fonts.sizes.xs      // 12px
theme.fonts.sizes.sm      // 14px
theme.fonts.sizes.base    // 16px
theme.fonts.sizes.md      // 18px
theme.fonts.sizes.lg      // 20px
theme.fonts.sizes.xl      // 24px
theme.fonts.sizes['2xl']  // 30px
theme.fonts.sizes['3xl']  // 36px
theme.fonts.sizes['4xl']  // 48px

theme.fonts.weights.normal    // 400
theme.fonts.weights.medium    // 500
theme.fonts.weights.semibold  // 600
theme.fonts.weights.bold      // 700
```

### Spacing

```typescript
theme.spacing.xs          // 4px
theme.spacing.sm          // 8px
theme.spacing.md          // 12px
theme.spacing.base        // 16px
theme.spacing.lg          // 20px
theme.spacing.xl          // 24px
theme.spacing['2xl']      // 32px
theme.spacing['3xl']      // 40px
theme.spacing['4xl']      // 48px
theme.spacing['5xl']      // 64px
```

### Border Radius

```typescript
theme.borderRadius.sm     // 4px
theme.borderRadius.md     // 8px
theme.borderRadius.lg     // 12px
theme.borderRadius.xl     // 16px
theme.borderRadius['2xl'] // 20px
theme.borderRadius.full   // 9999px (circle)
```

### Shadows

```typescript
theme.shadows.sm          // Small shadow
theme.shadows.md          // Medium shadow
theme.shadows.lg          // Large shadow
theme.shadows.xl          // Extra large shadow
```

## Components

### Button

A versatile button component with multiple variants, sizes, and states.

```typescript
import { Button } from './components';

<Button
  title="Click Me"
  onPress={() => console.log('Pressed')}
  variant="primary"
  size="md"
  leftIcon={<Icon name="add" size={16} />}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| title | string | required | Button text |
| onPress | () => void | required | Press handler |
| variant | 'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'text' | 'primary' | Visual style |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Button size |
| disabled | boolean | false | Disabled state |
| loading | boolean | false | Loading state |
| leftIcon | ReactNode | - | Icon before text |
| rightIcon | ReactNode | - | Icon after text |

### Input

A flexible input component with support for various types and states.

```typescript
import { Input } from './components';

const [value, setValue] = useState('');

<Input
  label="Email"
  placeholder="Enter your email"
  value={value}
  onChangeText={setValue}
  type="email"
  clearable
  maxLength={100}
  showCharacterCount
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| label | string | - | Input label |
| placeholder | string | - | Placeholder text |
| value | string | required | Current value |
| onChangeText | (text: string) => void | required | Change handler |
| type | 'text' \| 'password' \| 'number' \| 'email' \| 'phone' | 'text' | Input type |
| state | 'default' \| 'error' \| 'disabled' \| 'readonly' | 'default' | Input state |
| errorMessage | string | - | Error message |
| helperText | string | - | Helper text |
| prefix | ReactNode | - | Prefix element |
| suffix | ReactNode | - | Suffix element |
| clearable | boolean | false | Show clear button |
| maxLength | number | - | Maximum length |
| showCharacterCount | boolean | false | Show character count |

### Card

A container component with header, content, and footer sections.

```typescript
import { Card } from './components';

<Card
  title="Card Title"
  subtitle="Card Subtitle"
  onPress={() => console.log('Card pressed')}
  pressable
  variant="elevated"
>
  <Text>Card content goes here</Text>
</Card>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Card content |
| header | ReactNode | - | Custom header |
| footer | ReactNode | - | Custom footer |
| title | string | - | Card title |
| subtitle | string | - | Card subtitle |
| onPress | () => void | - | Press handler |
| pressable | boolean | false | Make card pressable |
| variant | 'default' \| 'elevated' \| 'outlined' | 'default' | Visual style |
| padding | 'none' \| 'sm' \| 'md' \| 'lg' | 'md' | Padding size |

### Modal

A modal dialog component with animations and gesture support.

```typescript
import { Modal } from './components';

const [visible, setVisible] = useState(false);

<Modal
  visible={visible}
  onClose={() => setVisible(false)}
  animationType="fade"
  size="md"
  closeOnBackdropPress
  closeOnSwipeDown
>
  <Text>Modal content</Text>
</Modal>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| visible | boolean | required | Modal visibility |
| onClose | () => void | required | Close handler |
| children | ReactNode | required | Modal content |
| animationType | 'none' \| 'slide' \| 'fade' \| 'scale' | 'fade' | Animation style |
| size | 'sm' \| 'md' \| 'lg' \| 'full' | 'md' | Modal size |
| closeOnBackdropPress | boolean | true | Close on backdrop press |
| closeOnSwipeDown | boolean | true | Close on swipe down |
| showCloseButton | boolean | true | Show close button |

### Icon

A simple icon component using Unicode symbols.

```typescript
import { Icon } from './components';

<Icon name="home" size={24} color={theme.colors.primary} />
```

**Available Icons:**

- **Navigation:** home, back, forward, menu, close, search, settings
- **Actions:** add, edit, delete, check, clear, refresh, share
- **Status:** success, warning, error, info, loading
- **Content:** user, email, phone, lock, star, heart, bookmark

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| name | IconName | required | Icon name |
| size | number | 24 | Icon size |
| color | string | theme.colors.text | Icon color |

## Theming

The design system supports light and dark themes out of the box.

```typescript
import { createTheme, lightTheme, darkTheme } from './theme';

// Use pre-defined themes
const theme = isDark ? darkTheme : lightTheme;

// Or create a custom theme
const customTheme = createTheme(isDark);
```

## Accessibility

All components in the design system are built with accessibility in mind:

- **Keyboard Navigation:** All interactive elements are keyboard accessible
- **Screen Reader Support:** Proper labels and descriptions for screen readers
- **Focus Management:** Clear focus indicators and logical tab order
- **Color Contrast:** Text meets WCAG 2.1 AA standards for contrast
- **Touch Targets:** Minimum touch target size of 44x44 points

## Component Stories

Component stories are available in `components/__stories__/` for development and documentation purposes.

- `Button.stories.tsx` - Button component variations
- `Input.stories.tsx` - Input component variations
- `Card.stories.tsx` - Card component variations
- `Icon.stories.tsx` - Icon showcase

## Contributing

When adding new components to the design system:

1. Follow the existing component patterns
2. Include TypeScript types
3. Add accessibility props
4. Write unit tests
5. Add a story file
6. Update this README

## License

Copyright (c) 2026 BridgeAI. All rights reserved.
