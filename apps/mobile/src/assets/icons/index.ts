/**
 * BridgeAI Icon System
 * Unified icon exports organized by category.
 * Icons are rendered through the Icon component using cross-platform Unicode symbols.
 */

// Navigation icons
export const navigationIcons = [
  'home',
  'back',
  'forward',
  'menu',
  'close',
  'search',
  'settings',
] as const;

// Action icons
export const actionIcons = ['add', 'edit', 'delete', 'check', 'clear', 'refresh', 'share'] as const;

// Status icons
export const statusIcons = ['success', 'warning', 'error', 'info', 'loading'] as const;

// Content icons
export const contentIcons = [
  'user',
  'email',
  'phone',
  'lock',
  'star',
  'heart',
  'bookmark',
] as const;

// All icon names combined
export const allIconNames = [
  ...navigationIcons,
  ...actionIcons,
  ...statusIcons,
  ...contentIcons,
] as const;

export type IconCategory = 'navigation' | 'actions' | 'status' | 'content';

export const iconCategories: Record<IconCategory, readonly string[]> = {
  navigation: navigationIcons,
  actions: actionIcons,
  status: statusIcons,
  content: contentIcons,
};
